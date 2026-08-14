import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { RpgDialogue } from "./RpgDialogue";
import {
  getAnswerForMessage,
  getFallbackMessage,
  shouldRedirectToBookAppointment,
} from "../data/companyKnowledge";

type Message = { role: "user" | "assistant"; text: string };

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    text: "Hey! Ask me about our services, pricing, business hours, or what we offer. If I can't help, I'll get you to a strategy call.",
  },
];

const CHATBOT_IMAGE = "/chatbot-avatar.png";
const CHATBOT_NAME = "Future Proof";

export function Chatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant")?.text ??
    INITIAL_MESSAGES[0].text;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    const answer = getAnswerForMessage(trimmed);

    if (answer && !shouldRedirectToBookAppointment(answer)) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      }, 400);
      return;
    }

    const fallback = getFallbackMessage();
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
    }, 400);

    redirectTimeoutRef.current = setTimeout(() => {
      navigate("/contact");
      redirectTimeoutRef.current = null;
    }, 3500);
  };

  return (
    <>
      {/* When closed: circle in bottom-right */}
      {!isOpen && (
        <motion.button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] flex h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 bg-slate-900 shadow-xl ring-4 ring-slate-950/50 hover:border-blue-500/50 hover:ring-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open chat"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <img
            src={CHATBOT_IMAGE}
            alt="Chat with us"
            className="h-full w-full object-cover object-top"
          />
        </motion.button>
      )}

      {/* When open: RPG dialogue fixed at bottom */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[90] flex flex-col justify-end">
            {/* Optional backdrop – tap to close (optional, or remove) */}
            <div
              className="absolute inset-0 bg-black/20"
              aria-hidden
              onClick={() => setIsOpen(false)}
            />

            <div className="relative">
              <RpgDialogue
                characterImage={CHATBOT_IMAGE}
                name={CHATBOT_NAME}
                message={latestAssistantMessage}
                onNext={() => {}}
                onClose={() => setIsOpen(false)}
              >
                {/* Input row inside the RPG bubble */}
                <div className="mt-2 flex gap-1.5 border-t border-white/20 pt-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type..."
                    className="min-w-0 flex-1 rounded border border-white/30 bg-black/50 px-2 py-1.5 text-[10px] text-white placeholder:text-white/50 focus:border-white focus:outline-none"
                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="shrink-0 rounded border-2 border-white bg-white px-2 py-1.5 text-[10px] text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white"
                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                    aria-label="Send"
                  >
                    SEND
                  </button>
                </div>
              </RpgDialogue>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
