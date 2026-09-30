/*
# Create media storage bucket for user uploads

1. Storage
- Create a public bucket named `media` for user-uploaded photos and videos.
- Files are stored under per-user paths: `media/<user_id>/<filename>`.
2. Security
- Public read access (bucket is public, so anyone can view uploaded media).
- Authenticated users can upload (INSERT) and update/delete (UPDATE/DELETE) only their own files.
- Path policy: users can only manage files under their own user_id folder.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_insert_own" ON storage.objects;
CREATE POLICY "media_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_update_own" ON storage.objects;
CREATE POLICY "media_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "media_delete_own" ON storage.objects;
CREATE POLICY "media_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
