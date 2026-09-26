import base64
import hashlib
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
import upload_anki_to_polar as u


class RequestTests(unittest.TestCase):
    def test_sets_a_non_default_user_agent(self):
        # Cloudflare (fronting api.polar.sh) returns error 1010 for Python's
        # default urllib User-Agent, seen live against the sandbox API.
        captured = {}

        def fake_urlopen(req, timeout=None):
            captured["user_agent"] = req.get_header("User-agent")
            return mock.mock_open(read_data=b"{}")()

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            u._request("GET", "https://example.test/v1/x", token="tok")

        self.assertIsNotNone(captured["user_agent"])
        self.assertNotIn("python-urllib", captured["user_agent"].lower())


class ChecksumTests(unittest.TestCase):
    def test_create_file_includes_the_part_sha256_checksum(self):
        data = b"hello-apkg"
        expected = base64.b64encode(hashlib.sha256(data).digest()).decode()

        def fake_request(method, url, token=None, body=None):
            return {"body": body}

        with mock.patch.object(u, "_request", side_effect=fake_request):
            result = u.create_file("tok", "x.apkg", len(data), checksum_b64=expected)

        part = result["body"]["upload"]["parts"][0]
        self.assertEqual(part["checksum_sha256_base64"], expected)

    def test_upload_part_sends_the_s3_checksum_header(self):
        # S3 rejected the upload with "Checksum Type mismatch ... expected
        # checksum Type: sha256, actual checksum Type: null" without this header
        # (seen live against the sandbox API).
        data = b"hello-apkg"
        checksum_b64 = base64.b64encode(hashlib.sha256(data).digest()).decode()
        captured = {}

        class FakeResponse:
            headers = {"ETag": '"abc123"'}

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake_urlopen(req, timeout=None):
            captured["checksum_header"] = req.get_header("X-amz-checksum-sha256")
            return FakeResponse()

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            u.upload_part({"url": "https://s3.example/part1"}, data, checksum_b64)

        self.assertEqual(captured["checksum_header"], checksum_b64)


class UploadFullDeckTests(unittest.TestCase):
    def setUp(self):
        self.tmp_file = os.path.join(os.path.dirname(__file__), "_tmp_test_deck.apkg")
        with open(self.tmp_file, "wb") as f:
            f.write(b"fake-apkg-bytes")

    def tearDown(self):
        os.remove(self.tmp_file)

    def test_replaces_old_file_and_updates_benefit(self):
        calls = []

        def fake_request(method, url, token=None, body=None):
            calls.append((method, url, body))
            if method == "POST" and url.endswith("/v1/files/"):
                return {
                    "id": "new-file-id",
                    "upload": {
                        "id": "upload-1",
                        "path": "up/path",
                        "parts": [{"number": 1, "url": "https://s3.example/part1"}],
                    },
                }
            if method == "POST" and url.endswith("/uploaded"):
                return {"id": "new-file-id", "is_uploaded": True}
            if method == "GET" and "/v1/benefits/" in url:
                return {"properties": {"files": ["old-file-id"]}}
            if method == "PATCH":
                return {"properties": {"files": ["new-file-id"]}}
            if method == "DELETE":
                return {}
            raise AssertionError("unexpected request %s %s" % (method, url))

        with mock.patch.object(u, "_request", side_effect=fake_request), mock.patch.object(
            u, "upload_part", return_value="etag-123"
        ):
            file_id = u.upload_full_deck(self.tmp_file, "tok", "benefit-1", version="1.2.3")

        self.assertEqual(file_id, "new-file-id")
        methods_urls = [(m, url) for m, url, _ in calls]
        self.assertIn(("DELETE", u.api_host() + "/v1/files/old-file-id"), methods_urls)
        patch_call = next(c for c in calls if c[0] == "PATCH")
        self.assertEqual(patch_call[2]["properties"]["files"], ["new-file-id"])
        create_call = next(c for c in calls if c[0] == "POST" and c[1].endswith("/v1/files/"))
        self.assertEqual(create_call[2]["version"], "1.2.3")

    def test_does_not_delete_the_file_it_just_attached(self):
        def fake_request(method, url, token=None, body=None):
            if method == "POST" and url.endswith("/v1/files/"):
                return {
                    "id": "same-id",
                    "upload": {"id": "u1", "path": "p", "parts": [{"number": 1, "url": "https://s3.example/part1"}]},
                }
            if method == "POST" and url.endswith("/uploaded"):
                return {}
            if method == "GET":
                return {"properties": {"files": ["same-id"]}}
            if method == "PATCH":
                return {}
            if method == "DELETE":
                raise AssertionError("must not delete the file that is still attached")
            raise AssertionError("unexpected request")

        with mock.patch.object(u, "_request", side_effect=fake_request), mock.patch.object(
            u, "upload_part", return_value="etag"
        ):
            u.upload_full_deck(self.tmp_file, "tok", "benefit-1")

    def test_old_file_survives_if_benefit_update_fails(self):
        deleted = []

        def fake_request(method, url, token=None, body=None):
            if method == "POST" and url.endswith("/v1/files/"):
                return {
                    "id": "new-file-id",
                    "upload": {"id": "u1", "path": "p", "parts": [{"number": 1, "url": "https://s3.example/part1"}]},
                }
            if method == "POST" and url.endswith("/uploaded"):
                return {}
            if method == "GET":
                return {"properties": {"files": ["old-file-id"]}}
            if method == "PATCH":
                # Mirrors what the real _request does on a Polar HTTP error: exits.
                raise SystemExit("Polar-API-Fehler PATCH ...: 500 boom")
            if method == "DELETE":
                deleted.append(url)
                return {}
            raise AssertionError("unexpected request")

        with mock.patch.object(u, "_request", side_effect=fake_request), mock.patch.object(
            u, "upload_part", return_value="etag"
        ):
            with self.assertRaises(SystemExit):
                u.upload_full_deck(self.tmp_file, "tok", "benefit-1")

        self.assertEqual(deleted, [])


if __name__ == "__main__":
    unittest.main()
