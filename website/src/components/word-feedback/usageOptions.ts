import CircleQuestionMark from "virtual:icons/lucide/circle-question-mark";
import Ear from "virtual:icons/lucide/ear";
import MessageCircleMore from "virtual:icons/lucide/message-circle-more";

export const USAGE_OPTIONS = [
  {
    hint: "Kommt mir regelmäßig übern Mund",
    icon: MessageCircleMore,
    label: "Sag ick selbst",
    value: "say",
  },
  { hint: "Hab ick schon mal jehört", icon: Ear, label: "Kenn ick", value: "know" },
  { hint: "Is mir janz neu", icon: CircleQuestionMark, label: "Nie jehört", value: "never" },
] as const;
