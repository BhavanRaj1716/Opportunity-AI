"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, SectionTitle, cn } from "@/components/ui";
import { COPILOT_PROMPTS, askCopilot } from "@/lib/copilot";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

export default function CopilotPage() {
  const { profile, activities } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi ${profile.name}! I'm your Opportunity Copilot. I know your Opportunity DNA — ${profile.careerGoal}, year ${profile.year} ${profile.department} — and every opportunity on the platform. Ask me what to do next.`,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name, profile.careerGoal]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: question },
    ]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: askCopilot(question, profile, activities),
        },
      ]);
      setThinking(false);
    }, 700);
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <SectionTitle
        title="AI Opportunity Copilot"
        subtitle="Career-aware answers grounded in your profile and the live opportunity pool."
        action={<Badge tone="mint">context: Opportunity DNA</Badge>}
      />

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "assistant" && (
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-600 to-accent-500 text-sm text-white">
                  ✦
                </span>
              )}
              <div
                className={cn(
                  "max-w-[42rem] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-linear-to-r from-brand-600 to-accent-500 text-white"
                    : "bg-ink-50 text-ink-800",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-600 to-accent-500 text-sm text-white">
                ✦
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl bg-ink-50 px-4 py-3.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="size-2 animate-bounce rounded-full bg-ink-400"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-ink-200 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {COPILOT_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => send(prompt)}
                className="cursor-pointer rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about opportunities, skills, deadlines or your career plan…"
              className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />
            <Button type="submit" disabled={thinking} className="px-5">
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
