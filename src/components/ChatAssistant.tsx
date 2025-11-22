import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickQuestions = [
    "What should I work on?",
    "Show my tasks",
    "Any issues?",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Please try again'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[1000] w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Chat Assistant"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[999] w-[90vw] sm:w-96 h-[500px] flex flex-col glass-card overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Assistant</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-base"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center pt-8 space-y-4">
                <MessageCircle className="w-12 h-12 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Ask about your work, jobs, or issues
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {quickQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="px-3 py-1.5 text-xs bg-background/50 hover:bg-background border border-border rounded-lg transition-base"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-background border border-border'
                  }`}
                >
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-background/50 border border-border'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-background border border-border">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
                <div className="px-3 py-2 bg-background/50 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-background/30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={loading}
                className="flex-1 text-sm bg-background border-border"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !input.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
