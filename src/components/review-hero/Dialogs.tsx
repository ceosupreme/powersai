import { useState } from "react";
import { Copy, Mail, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EMAIL, PACKAGES, PHONE } from "./config";

export type DialogKind = "contact" | "packages" | "blog" | null;

export function ReviewDialogs({ open, setOpen }: { open: DialogKind; setOpen: (k: DialogKind) => void }) {
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const close = (v: boolean) => { if (!v) setOpen(null); };
  return (
    <>
      <Dialog open={open === "contact"} onOpenChange={close}>
        <DialogContent className="rh-dialog">
          <DialogTitle className="rh-dialog-title">Contact Us</DialogTitle>
          <DialogDescription className="rh-dialog-text">Call or email us directly. No form required.</DialogDescription>
          <div className="rh-dialog-actions">
            {PHONE ? (
              <div className="rh-row">
                <a className="rh-btn rh-btn-primary" href={`tel:${PHONE.tel}`}><Phone size={18} aria-hidden /> Call Us · {PHONE.display}</a>
                <button type="button" className="rh-btn rh-btn-ghost rh-desktop-only" onClick={async () => { try { await navigator.clipboard.writeText(PHONE.display); setCopied("ok"); } catch { setCopied("fail"); } }}>
                  <Copy size={16} aria-hidden /> {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed — select the number" : "Copy number"}
                </button>
              </div>
            ) : (
              <div className="rh-pending" role="note"><Phone size={18} aria-hidden /> <span><strong>Phone connection pending</strong> — review only. The number will be added once the owner confirms it.</span></div>
            )}
            <a className={PHONE ? "rh-btn rh-btn-ghost" : "rh-btn rh-btn-primary"} href={`mailto:${EMAIL}`}><Mail size={18} aria-hidden /> Email {EMAIL}</a>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "packages"} onOpenChange={close}>
        <DialogContent className="rh-dialog rh-dialog-wide">
          <DialogTitle className="rh-dialog-title">Built around your business.</DialogTitle>
          <DialogDescription className="rh-dialog-text">Most work starts with a conversation and a solution shaped to fit. If one of these starting points fits, we tailor it from there.</DialogDescription>
          <ul className="rh-packages">
            {PACKAGES.map((p) => (
              <li key={p.name}>
                <h3>{p.name}</h3>
                {"line" in p && p.line && <p className="rh-pkg-line">{p.line}</p>}
                <p>{p.body}</p>
                <p className="rh-pkg-price">{p.price}</p>
                {"note" in p && p.note && <p className="rh-pkg-note">{p.note}</p>}
              </li>
            ))}
          </ul>
          <button type="button" className="rh-btn rh-btn-primary" onClick={() => setOpen("contact")}>Contact Us</button>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "blog"} onOpenChange={close}>
        <DialogContent className="rh-dialog">
          <DialogTitle className="rh-dialog-title">Blog — coming in first release</DialogTitle>
          <DialogDescription className="rh-dialog-text">Preview note: the educational blog is planned for the first release and is not built in this preview.</DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
