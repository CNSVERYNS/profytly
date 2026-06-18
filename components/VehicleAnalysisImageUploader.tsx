"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

const BUCKET_NAME = "vehicle-analysis-images";
const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type StoredVehicleImage = {
  id: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
  signedUrl: string;
};

type Props = {
  vehicleId: string;
  userId: string;
  analysisRunning: boolean;
  onRunAnalysis: () => Promise<void>;
};

export default function VehicleAnalysisImageUploader({
  vehicleId,
  userId,
  analysisRunning,
  onRunAnalysis,
}: Props) {
  const [images, setImages] = useState<StoredVehicleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const loadImages = useCallback(async () => {
    if (!vehicleId || !userId) {
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("vehicle_analysis_images")
      .select(
        "id, storage_path, original_name, mime_type, size_bytes, sort_order, created_at"
      )
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setIsError(true);
      setLoading(false);
      return;
    }

    const rows = data ?? [];

    const signedRows = await Promise.all(
      rows.map(async (row) => {
        const { data: signedData, error: signedError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(row.storage_path, 60 * 60);

        if (signedError || !signedData?.signedUrl) {
          return null;
        }

        return {
          ...row,
          signedUrl: signedData.signedUrl,
        } as StoredVehicleImage;
      })
    );

    setImages(
      signedRows.filter(
        (image): image is StoredVehicleImage => image !== null
      )
    );

    setLoading(false);
  }, [userId, vehicleId]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    setMessage("");
    setIsError(false);

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {
      setMessage(`A maximum of ${MAX_IMAGES} photos can be analyzed.`);
      setIsError(true);
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      setMessage(
        `You can add ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"}.`
      );
      setIsError(true);
      return;
    }

    const invalidType = selectedFiles.find(
      (file) => !ALLOWED_TYPES.has(file.type)
    );

    if (invalidType) {
      setMessage("Only JPG, PNG and WEBP images are allowed.");
      setIsError(true);
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      setMessage("Each image must be 10 MB or smaller.");
      setIsError(true);
      return;
    }

    setUploading(true);

    const uploadedPaths: string[] = [];

    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const extension = getFileExtension(file);
        const storagePath = `${userId}/${vehicleId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPaths.push(storagePath);

        const { error: metadataError } = await supabase
          .from("vehicle_analysis_images")
          .insert({
            vehicle_id: vehicleId,
            user_id: userId,
            bucket_id: BUCKET_NAME,
            storage_path: storagePath,
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            sort_order: images.length + index,
            source: "manual_upload",
          });

        if (metadataError) {
          await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
          throw new Error(metadataError.message);
        }
      }

      setMessage(
        `${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} uploaded. Run the full analysis so AI Vision can inspect them.`
      );
      setIsError(false);
      await loadImages();
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(uploadedPaths);
        await supabase
          .from("vehicle_analysis_images")
          .delete()
          .in("storage_path", uploadedPaths)
          .eq("user_id", userId);
      }

      setMessage(
        error instanceof Error ? error.message : "Image upload failed."
      );
      setIsError(true);
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(image: StoredVehicleImage) {
    const confirmed = window.confirm("Delete this analysis photo?");

    if (!confirmed) {
      return;
    }

    setDeletingId(image.id);
    setMessage("");
    setIsError(false);

    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([image.storage_path]);

    if (storageError) {
      setMessage(storageError.message);
      setIsError(true);
      setDeletingId(null);
      return;
    }

    const { error: rowError } = await supabase
      .from("vehicle_analysis_images")
      .delete()
      .eq("id", image.id)
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId);

    if (rowError) {
      setMessage(rowError.message);
      setIsError(true);
      setDeletingId(null);
      return;
    }

    setMessage("Photo deleted.");
    await loadImages();
    setDeletingId(null);
  }

  return (
    <section className="mt-8 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-zinc-900 to-zinc-900 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">Auction Photo Analysis</h2>

            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
              {images.length}/{MAX_IMAGES} uploaded
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-zinc-400">
            Upload front, rear, both sides, interior and close-up damage photos.
            Profytly will use up to six photos to estimate visible repairs and
            hidden-damage risk.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label
            className={`cursor-pointer rounded-lg border border-blue-500/40 px-5 py-3 font-semibold text-blue-300 transition hover:border-blue-400 ${
              uploading || images.length >= MAX_IMAGES
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            {uploading ? "Uploading..." : "Upload Photos"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={uploading || images.length >= MAX_IMAGES}
            />
          </label>

          <button
            type="button"
            onClick={() => void onRunAnalysis()}
            disabled={analysisRunning || images.length === 0}
            className="rounded-lg bg-green-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analysisRunning ? "Analyzing Photos..." : "Run Vision Analysis"}
          </button>
        </div>
      </div>

      {message && (
        <p className={`mt-4 text-sm ${isError ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading uploaded photos...</p>
      ) : images.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-8 text-center">
          <p className="font-semibold text-zinc-300">No analysis photos uploaded.</p>
          <p className="mt-2 text-sm text-zinc-500">
            This temporary upload option lets us test AI Vision until automatic
            Copart photo import is connected.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
            >
              <a href={image.signedUrl} target="_blank" rel="noreferrer">
                <img
                  src={image.signedUrl}
                  alt={`Auction analysis photo ${index + 1}`}
                  className="h-52 w-full object-cover"
                />
              </a>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-200">
                    {image.original_name || `Photo ${index + 1}`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatFileSize(image.size_bytes)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void deleteImage(image)}
                  disabled={deletingId === image.id}
                  className="text-sm text-red-400 disabled:opacity-50"
                >
                  {deletingId === image.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-zinc-500">
        Photos are stored in a private Supabase bucket and are sent to the AI
        through short-lived signed URLs only when you run an analysis.
      </p>
    </section>
  );
}

function getFileExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (extensionFromName && ["jpg", "jpeg", "png", "webp"].includes(extensionFromName)) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

function formatFileSize(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Size unavailable";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
