'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { JSONContent } from '@tiptap/react'
import { useState } from 'react'
import MediaPicker from './MediaPicker'

interface TiptapEditorProps {
  content: JSONContent | null
  onChange: (json: JSONContent) => void
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
        active
          ? 'bg-amber-100 text-amber-700'
          : 'text-zinc-500 hover:bg-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      ImageExt,
      LinkExt.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Schreibe deinen Beitrag...' }),
    ],
    content: content ?? undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-zinc max-w-none min-h-[300px] focus:outline-none px-5 py-4',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON())
    },
  })

  if (!editor) return null

  const handleLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL eingeben', previousUrl ?? '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const handleImageSelect = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run()
    setMediaPickerOpen(false)
  }

  return (
    <>
      <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
          >
            H3
          </ToolbarButton>

          <span className="w-px bg-zinc-200 mx-1 self-stretch" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            Bold
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            Italic
          </ToolbarButton>

          <span className="w-px bg-zinc-200 mx-1 self-stretch" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
          >
            Liste
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
          >
            1.2.3.
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
          >
            Zitat
          </ToolbarButton>

          <span className="w-px bg-zinc-200 mx-1 self-stretch" />

          <ToolbarButton onClick={handleLink} active={editor.isActive('link')}>
            Link
          </ToolbarButton>
          <ToolbarButton onClick={() => setMediaPickerOpen(true)}>
            Bild
          </ToolbarButton>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>

      <MediaPicker
        open={mediaPickerOpen}
        onSelect={handleImageSelect}
        onClose={() => setMediaPickerOpen(false)}
      />
    </>
  )
}
