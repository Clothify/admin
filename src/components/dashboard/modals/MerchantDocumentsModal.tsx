"use client";
import * as React from "react";
import { toUserError } from "@/lib/api";
import { MapPin, Phone } from "lucide-react";
import ModalBase from "./ModalBase";
import Lightbox from "./PhotoLightbox";
import type { Merchant } from "@/lib/merchants";
import { reviewMerchantDocument } from "@/lib/merchants";

const imageSlots = [
  ["MERCHANT_BUSINESS_LOGO", "Business Logo"],
  ["MERCHANT_STOREFRONT", "Storefront"],
  ["MERCHANT_INTERIOR", "Interior"],
  ["MERCHANT_EQUIPMENT", "Equipment"],
  ["MERCHANT_FINISHED_LAUNDRY", "Finished Laundry"],
] as const;

export default function MerchantDocumentsModal({
  open,
  onClose,
  merchant,
  onApprove,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  merchant?: Merchant;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [lightbox, setLightbox] = React.useState<string | null>(null);
  const [reviewed, setReviewed] = React.useState<Record<string, string>>({});
  const [reason, setReason] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    setReviewed({});
    setReason({});
    setError("");
  }, [merchant?.id, open]);
  if (!open || !merchant) return null;

  const docs = merchant.documents || [];
  const primaryDoc = docs.find((d) => d.type === "MERCHANT_CAC");
  const named = imageSlots.some(([type]) =>
    docs.some((doc) => doc.type === type),
  );
  const required = [
    primaryDoc,
    ...imageSlots.map(([type]) => docs.find((doc) => doc.type === type)),
  ];
  const isApproved = (doc: typeof primaryDoc) =>
    !!doc && ["APPROVED", "VERIFIED"].includes(reviewed[doc.id] || doc.status);
  const complete = named
    ? required.every(isApproved)
    : !!primaryDoc &&
      isApproved(primaryDoc) &&
      docs.filter((d) => d.type === "MERCHANT_STORE_IMAGE" && isApproved(d))
        .length >= 4 &&
      docs.some((d) => d.type === "MERCHANT_COVER_IMAGE" && isApproved(d));
  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !reason[id]?.trim()) {
      setError("Enter a reason for this image rejection.");
      return;
    }
    setBusy(id);
    setError("");
    try {
      await reviewMerchantDocument(id, status, reason[id]);
      setReviewed((prev) => ({ ...prev, [id]: status }));
    } catch (e: any) {
      setError(toUserError(e, "Could not save review. Please retry."));
    } finally {
      setBusy(null);
    }
  };

  const DocTile = ({
    url,
    label,
    small = false,
  }: {
    url?: string;
    label: string;
    small?: boolean;
  }) =>
    url && /\.pdf(?:[?#]|$)/i.test(url) ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center rounded border px-4 text-blue-900"
      >
        Open {label} PDF
      </a>
    ) : (
      <button
        className={`relative rounded-lg bg-gray-200 overflow-hidden ${small ? "h-[76px]" : "h-[140px] w-[220px]"}`}
        onClick={() => url && setLightbox(url)}
        type="button"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className={`h-full w-full ${label === "Business Logo" ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-gray-600 text-sm">
            No file
          </span>
        )}
      </button>
    );

  return (
    <>
      <ModalBase open={open} onClose={onClose} width={540} z={100}>
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-[24px] font-semibold text-gray-900 text-center">
            Documents
          </h3>

          <div className="mt-4 flex items-center justify-center gap-8 text-[14px]">
            <div className="flex items-center gap-2 text-blue-900">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">
                {merchant.businessName}, {merchant.city ?? "-"}
              </span>
            </div>
            <a
              className="flex items-center gap-2 text-blue-700 hover:underline"
              href={`tel:${merchant.phoneNumber}`}
            >
              <Phone className="h-4 w-4" />
              {merchant.phoneNumber}
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 text-center text-gray-500 bg-gray-50">
              Service Requesting
            </div>
            <div className="px-4 py-3 text-center font-medium text-gray-900">
              {merchant.serviceTier ?? "Merchant"}
            </div>
          </div>

          <div className="mt-5 max-h-[55vh] overflow-y-auto space-y-4">
            {[
              ...imageSlots.map(([type, label]) => ({
                label,
                doc: docs.find((d) => d.type === type),
              })),
              { label: "CAC document", doc: primaryDoc },
              ...docs
                .filter(
                  (d) =>
                    !imageSlots.some(([type]) => type === d.type) &&
                    d.type !== "MERCHANT_CAC",
                )
                .map((doc) => ({ label: `Legacy: ${doc.type}`, doc })),
            ].map(({ label, doc }) => (
              <div key={doc?.id || label} className="border-b pb-4">
                <div className="font-semibold text-gray-900">{label}</div>
                <div className="mt-2 text-sm text-gray-600">
                  {doc ? reviewed[doc.id] || doc.status : "Missing"}
                </div>
                {doc ? (
                  <>
                    <div className="mt-3">
                      <DocTile url={doc.url} label={label} />
                    </div>
                    {doc.metadata?.reviewReason ? (
                      <p className="text-sm text-red-700 mt-2">
                        {doc.metadata.reviewReason}
                      </p>
                    ) : null}
                    <label className="block text-sm mt-3">
                      Replacement reason
                      <input
                        aria-label={`${label} rejection reason`}
                        className="mt-1 w-full rounded border p-2"
                        value={reason[doc.id] || ""}
                        onChange={(e) =>
                          setReason((prev) => ({
                            ...prev,
                            [doc.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="flex gap-3 mt-3">
                      <button
                        disabled={!!busy}
                        onClick={() => review(doc.id, "APPROVED")}
                        className="rounded bg-[#233A78] text-white px-3 py-2"
                      >
                        Approve file
                      </button>
                      <button
                        disabled={!!busy}
                        onClick={() => review(doc.id, "REJECTED")}
                        className="rounded border px-3 py-2"
                      >
                        Reject file
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    Merchant must submit this category.
                  </p>
                )}
              </div>
            ))}
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {!complete ? (
            <p className="mt-3 text-sm text-gray-600">
              Review and approve all required documents before approving this
              merchant. Legacy files retain their original labels.
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <button
              disabled={!complete || !!busy}
              onClick={() => {
                onApprove();
                onClose();
              }}
              className="h-11 rounded-xl bg-[#233A78] text-white font-semibold disabled:opacity-40"
            >
              Approve
            </button>
            <button
              onClick={() => {
                onReject();
                onClose();
              }}
              className="h-11 rounded-xl bg-white text-gray-700 border"
            >
              Reject
            </button>
          </div>
        </div>
      </ModalBase>

      <Lightbox
        open={!!lightbox}
        src={lightbox || ""}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
