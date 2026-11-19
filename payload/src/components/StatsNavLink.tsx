import Link from "next/link";

/** Entry in the admin navigation (`admin.components.afterNavLinks`). */
export default function StatsNavLink() {
  return (
    <Link href="/admin/stats" style={{ display: "block", padding: "0.5rem 0" }}>
      Statistik
    </Link>
  );
}
