import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, StickyNote, Clock, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  author_id: string;
}

interface Props {
  proposalId: string;
  storeId: string;
}

const NOTE_TYPE_CONFIG: Record<string, { label: string; icon: typeof StickyNote; className: string }> = {
  note: { label: "Nota", icon: StickyNote, className: "bg-blue-100 text-blue-700 border-blue-200" },
  status_change: { label: "Status", icon: ArrowRightLeft, className: "bg-amber-100 text-amber-700 border-amber-200" },
  follow_up: { label: "Follow-up", icon: Clock, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const ProposalNotesPanel = ({ proposalId, storeId }: Props) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("proposal_notes" as any)
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: false });

    if (!error && data) setNotes(data as any);
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, [proposalId]);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("proposal_notes" as any)
        .insert({
          proposal_id: proposalId,
          store_id: storeId,
          author_id: user.id,
          content: newNote.trim(),
          note_type: "note",
        } as any);

      if (error) throw error;
      setNewNote("");
      toast.success("Nota adicionada");
      loadNotes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar nota");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Adicionar anotação sobre este lead..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[60px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!newNote.trim() || sending}
          className="shrink-0 h-auto"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="max-h-[300px]">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma anotação ainda
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => {
              const config = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.note;
              const Icon = config.icon;
              return (
                <div
                  key={note.id}
                  className="border border-border/50 rounded-lg p-3 bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.className}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(note.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ProposalNotesPanel;
