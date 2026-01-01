import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { supabase } from '../lib/supabase';
import { uploadToS3 } from '../utils/s3Storage';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Masukkan keterangan campaign...' }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  // Initialize Quill
  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent double initialization
    if (quillRef.current) return;

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: placeholder,
      modules: {
        toolbar: {
          container: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            [{ 'size': [] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
          ],
          handlers: {
            image: imageHandler
          }
        },
        clipboard: {
          matchVisual: false
        }
      }
    });

    quill.on('text-change', () => {
      onChange(quill.root.innerHTML);
    });

    quillRef.current = quill;

    // Set initial value
    if (value) {
      quill.root.innerHTML = value;
    }

    return () => {
      // Cleanup if needed? Quill doesn't have a strict destroy, but we should clear ref
      quillRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); // Run once on mount

  // Sync value changes from parent
  useEffect(() => {
    if (quillRef.current) {
      if (value !== quillRef.current.root.innerHTML) {
        // Only update if content is different to avoid cursor jumps
        // But basic innerHTML comparison is tricky with Quill
        // For now, this is standard React-Quill pattern
        // A better check might be needed if user types fast
        const currentContent = quillRef.current.root.innerHTML;
        if (value !== currentContent) {
          quillRef.current.root.innerHTML = value;
        }
      }
    }
  }, [value]);

  const imageHandler = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const quill = quillRef.current;
      if (!quill) return;

      const range = quill.getSelection(true);
      const index = range?.index || 0;

      // Insert placeholder
      quill.insertText(index, 'Uploading image...', 'user');
      quill.setSelection(index + 20);

      try {
        // Upload original image without resize
        let imageUrl: string | null = null;

        // Try S3 upload
        const s3Url = await uploadToS3(file, 'campaigns/editor');
        if (s3Url) {
          imageUrl = s3Url;
        } else {
          // Fallback to Supabase Storage
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `campaigns/editor/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('campaigns')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (!uploadError) {
            const { data } = supabase.storage
              .from('campaigns')
              .getPublicUrl(filePath);
            imageUrl = data.publicUrl;
          }
        }

        if (imageUrl) {
          // Remove placeholder and insert image
          quill.deleteText(index, 20);
          quill.insertEmbed(index, 'image', imageUrl, 'user');
          quill.setSelection(index + 1);
        } else {
          // Remove placeholder and show error
          quill.deleteText(index, 20);
          quill.insertText(index, 'Failed to upload image', 'user');
          toast.error('Gagal mengupload gambar. Silakan coba lagi.');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        if (quill) {
          quill.deleteText(index, 20);
          quill.insertText(index, 'Failed to upload image', 'user');
        }
        toast.error('Gagal mengupload gambar. Silakan coba lagi.');
      }
    };
  };

  return (
    <div className="rich-text-editor">
      <div
        ref={containerRef}
        style={{ minHeight: '250px' }}
      />
      <style>{`
        .rich-text-editor .ql-container {
          min-height: 250px;
          font-size: 16px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border: 2px solid #e5e7eb;
          border-top: none;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          border: 2px solid #e5e7eb;
          border-bottom: none;
        }
        .rich-text-editor .ql-container:focus-within,
        .rich-text-editor .ql-toolbar:focus-within {
          border-color: #f97316;
        }
        .rich-text-editor .ql-editor {
          min-height: 250px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          font-style: normal;
          color: #9ca3af;
        }
        .rich-text-editor .ql-editor img {
          width: 650px;
          height: 350px;
          object-fit: cover;
          object-position: center;
          display: block;
          margin: 1em auto;
          border-radius: 0.5rem;
        }
        @media (max-width: 768px) {
          .rich-text-editor .ql-editor img {
            width: 100%;
            height: auto;
            max-height: 350px;
            object-fit: contain;
          }
        }
        
        /* Fix for Tailwind Preflight resetting list styles */
        .rich-text-editor .ql-editor ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 1rem;
        }
        .rich-text-editor .ql-editor ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 1rem;
        }
        .rich-text-editor .ql-editor li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}

