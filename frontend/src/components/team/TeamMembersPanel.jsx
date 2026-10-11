import { useState } from "react";
import { X, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

export function TeamMembersPanel({ team, allUsers, onAddMember, onRemoveMember }) {
  const [open, setOpen] = useState(false);
  const members = allUsers.filter((u) =>
    (u.teamIds || []).some((t) => String(t._id || t) === String(team._id))
  );
  const nonMembers = allUsers.filter((u) =>
    !(u.teamIds || []).some((t) => String(t._id || t) === String(team._id))
  );

  return (
    <div className="mt-2 border border-line/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-ink/[0.03] text-xs text-fg-muted font-medium hover:bg-ink/[0.06]"
      >
        <span>Membros ({members.length})</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {members.length === 0 && (
            <p className="text-xs text-fg-dim">Nenhum membro neste time.</p>
          )}
          {members.map((u) => (
            <div key={u._id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fg">{u.name}</p>
                <p className="text-xs text-fg-dim">{u.email}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveMember(team._id, u._id)}
                className="p-1.5 rounded text-fg-dim hover:text-danger hover:bg-danger/10"
                title="Remover do time"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {nonMembers.length > 0 && (
            <div className="pt-2 border-t border-line/10">
              <p className="text-xs text-fg-muted mb-1">Adicionar usuário:</p>
              {nonMembers.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => onAddMember(team._id, u._id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-brandSolid-500/10 text-left"
                >
                  <UserPlus size={13} className="text-brandSolid-300 shrink-0" />
                  <span className="text-sm text-fg/90">{u.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
