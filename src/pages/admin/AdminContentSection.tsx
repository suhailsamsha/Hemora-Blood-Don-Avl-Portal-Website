import { useEffect, useState, type FormEvent } from 'react';
import { Edit3, FileText, Plus, Save, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { api } from '../../lib/api.ts';
import type { FaqItem, SiteContentItem } from '../../shared/types.ts';

interface AdminContentSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminContentSection({ token, onToast, onAuthError }: AdminContentSectionProps) {
  const [contents, setContents] = useState<SiteContentItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deleteFaqTarget, setDeleteFaqTarget] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadContent() {
    setLoading(true);
    try {
      const data = await api.getAdminContent(token);
      setContents(data.contents);
      setFaqs(data.faqs);
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveBlock(item: SiteContentItem) {
    try {
      await api.saveSiteContent(token, item.key, {
        title: item.title,
        body: item.body,
        active: item.active,
      });
      onToast('success', `Saved "${item.key}" content block.`);
      await loadContent();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function handleCreateFaq(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createFaq(token, {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        sortOrder: faqs.length + 1,
      });
      onToast('success', 'Added new FAQ item.');
      setNewQuestion('');
      setNewAnswer('');
      await loadContent();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function handleSaveFaqEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingFaq) return;
    try {
      await api.updateFaq(token, editingFaq.id, {
        question: editingFaq.question,
        answer: editingFaq.answer,
      });
      onToast('success', 'Updated FAQ.');
      setEditingFaq(null);
      await loadContent();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function confirmDeleteFaq() {
    if (!deleteFaqTarget) return;
    setDeleting(true);
    try {
      await api.deleteFaq(token, deleteFaqTarget.id);
      onToast('success', 'Deleted FAQ item.');
      setDeleteFaqTarget(null);
      await loadContent();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Editable Announcements & Awareness Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">Loading CMS content...</p>
        ) : (
          contents.map((block, idx) => (
            <div
              key={block.key}
              className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E]">
                    {block.key.replace('_', ' ')}
                  </span>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={block.active}
                    onChange={(e) => {
                      const next = [...contents];
                      next[idx] = { ...block, active: e.target.checked };
                      setContents(next);
                    }}
                    className="h-4 w-4 accent-[#B3261E]"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Title</label>
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => {
                    const next = [...contents];
                    next[idx] = { ...block, title: e.target.value };
                    setContents(next);
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Body Copy</label>
                <textarea
                  rows={3}
                  value={block.body}
                  onChange={(e) => {
                    const next = [...contents];
                    next[idx] = { ...block, body: e.target.value };
                    setContents(next);
                  }}
                  className="w-full rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 p-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#A8A29E]">
                  Last updated by {block.updatedBy}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSaveBlock(block)}
                  className="min-h-[40px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Block</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAQs CRUD */}
      <div className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Manage Awareness FAQs</h2>

        <form onSubmit={handleCreateFaq} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            minLength={4}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="FAQ Question"
            className="min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
          />
          <input
            type="text"
            required
            minLength={4}
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Plain-language answer"
            className="min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add FAQ</span>
          </button>
        </form>

        <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
          {faqs.map((faq) => (
            <div key={faq.id} className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F2EE]">{faq.question}</div>
                <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingFaq(faq)}
                  className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium inline-flex items-center gap-1 hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteFaqTarget(faq)}
                  aria-label="Delete FAQ"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-[#E6B8B5] dark:border-[#B3261E]/40 text-[#B3261E] dark:text-[#F28B82] hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSaveFaqEdit}
            className="w-full max-w-md rounded-[24px] ios-hero-glass p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Edit FAQ</h3>
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Question</label>
              <input
                type="text"
                required
                value={editingFaq.question}
                onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Answer</label>
              <textarea
                rows={4}
                required
                value={editingFaq.answer}
                onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                className="w-full rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 p-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold transition-colors"
              >
                Save FAQ
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteFaqTarget)}
        title="Delete FAQ item?"
        message={deleteFaqTarget ? `Remove FAQ "${deleteFaqTarget.question}"?` : ''}
        confirmLabel="Delete FAQ"
        busy={deleting}
        onConfirm={() => void confirmDeleteFaq()}
        onCancel={() => setDeleteFaqTarget(null)}
      />
    </div>
  );
}
