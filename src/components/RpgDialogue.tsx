import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import Typed from "typed.js";
import { X } from "lucide-react";

export type RpgDialogueProps = {
  characterImage: string;
  name: string;
  message: string;
  onNext?: () => void;
  onClose?: () => void;
  children?: ReactNode;
};

const TYPED_OPTIONS = {
  typeSpeed: 30,
  backSpeed: 0,
  showCursor: false,
};

export function RpgDialogue({
  characterImage,
  name,
  message,
  onNext,
  onClose,
  children,
}: RpgDialogueProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const typedRef = useRef<Typed | null>(null);

  useEffect(() => {
    if (!textRef.current || !message) return;

    if (typedRef.current) {
      typedRef.current.destroy();
      typedRef.current = null;
    }

    textRef.current.textContent = "";

    typedRef.current = new Typed(textRef.current, {
      strings: [message],
      ...TYPED_OPTIONS,
    });

    return () => {
      typedRef.current?.destroy();
      typedRef.current = null;
    };
  }, [message]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="fixed bottom-4 right-4 z-[100] flex max-w-[calc(100vw-2rem)] items-end gap-0 sm:bottom-6 sm:right-6"
    >
      {/* Character portrait – left */}
      <div className="flex shrink-0 items-end">
        <div className="h-20 w-20 overflow-hidden rounded-lg border-[3px] border-white bg-slate-900 sm:h-24 sm:w-24">
          <img
            src={characterImage}
            alt={name}
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>

      {/* Dialogue bubble – rounded black, white border */}
      <div className="relative ml-1.5 flex min-h-[90px] w-[280px] min-w-0 flex-col rounded-2xl border-[3px] border-white bg-black/90 px-3 py-3 pr-10 sm:min-h-[100px] sm:w-[340px] sm:px-4 sm:py-4 sm:pr-12">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white hover:bg-white hover:text-black focus:outline-none sm:right-3 sm:top-3"
            aria-label="Close"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <p
          className="shrink-0 text-white"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "8px" }}
        >
          {name}
        </p>
        <div
          className="mt-1.5 min-h-[2.5rem] max-h-28 flex-1 overflow-y-auto overflow-x-hidden py-0.5 pr-6 text-white sm:max-h-32"
          style={{ fontFamily: "'Press Start 2P', cursive" }}
        >
          <span
            ref={textRef}
            className="block text-[8px] leading-[1.6] sm:text-[9px]"
            style={{ fontFamily: "'Press Start 2P', cursive", wordBreak: "break-word" }}
          />
        </div>

        {children}

        {/* Next indicator – white triangle, bottom-right, bounce */}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute bottom-3 right-3 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Next"
          >
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="block border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent border-l-white"
              style={{ width: 0, height: 0 }}
            />
          </button>
        )}
      </div>
    </motion.div>
  );
}
