// components/admin/RichTextEditor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Highlighter,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Eraser,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Rédigez votre contenu ici...',
  className = '',
  disabled = false
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Exclure link et underline car on les ajoute séparément
        link: false,
        underline: false,
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 hover:underline' }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Highlight.configure({ multicolor: true })
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    // Éviter l'avertissement d'hydratation
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[180px] sm:min-h-[200px] p-3 sm:p-4 ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`
      }
    }
  })

  // ✅ SYNCHRONISATION : quand `value` change, on met à jour l'éditeur
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-gray-400">
        Chargement de l'éditeur...
      </div>
    )
  }

  const addImage = () => {
    const url = window.prompt("Entrez l'URL de l'image:")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = () => {
    if (showLinkInput) {
      if (linkUrl) {
        const formattedUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
        editor.chain().focus().setLink({ href: formattedUrl }).run()
      }
      setShowLinkInput(false)
      setLinkUrl('')
    } else {
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      )
      if (selectedText) {
        const marks = editor.state.doc.resolve(editor.state.selection.from).marks()
        const existingLink = marks.find(mark => mark.type.name === 'link')
        if (existingLink) {
          setLinkUrl(existingLink.attrs.href || '')
        }
        setShowLinkInput(true)
      } else {
        setShowLinkInput(true)
      }
    }
  }

  const removeLink = () => {
    editor.chain().focus().unsetLink().run()
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const clearContent = () => {
    if (confirm('Voulez-vous effacer tout le contenu ?')) {
      editor.chain().focus().clearContent().run()
    }
  }

  const getToolbarClass = (active: boolean) => {
    return `p-1.5 sm:p-2 rounded hover:bg-gray-200 transition-colors ${
      active ? 'bg-gray-200 text-blue-600' : 'text-gray-700'
    }`
  }

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* Barre d'outils responsive */}
      <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        {/* Annuler / Rétablir */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 sm:p-2 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          type="button"
          title="Annuler"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 sm:p-2 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          type="button"
          title="Rétablir"
        >
          <Redo size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Titres */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={getToolbarClass(editor.isActive('heading', { level: 1 }))}
          type="button"
          title="Titre 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={getToolbarClass(editor.isActive('heading', { level: 2 }))}
          type="button"
          title="Titre 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={getToolbarClass(editor.isActive('heading', { level: 3 }))}
          type="button"
          title="Titre 3"
        >
          <Heading3 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Formatage */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={getToolbarClass(editor.isActive('bold'))}
          type="button"
          title="Gras"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={getToolbarClass(editor.isActive('italic'))}
          type="button"
          title="Italique"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={getToolbarClass(editor.isActive('underline'))}
          type="button"
          title="Souligné"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={getToolbarClass(editor.isActive('strike'))}
          type="button"
          title="Barré"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={getToolbarClass(editor.isActive('highlight'))}
          type="button"
          title="Surligné"
        >
          <Highlighter size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Listes */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={getToolbarClass(editor.isActive('bulletList'))}
          type="button"
          title="Liste à puces"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={getToolbarClass(editor.isActive('orderedList'))}
          type="button"
          title="Liste numérotée"
        >
          <ListOrdered size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Alignement */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={getToolbarClass(editor.isActive({ textAlign: 'left' }))}
          type="button"
          title="Aligner à gauche"
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={getToolbarClass(editor.isActive({ textAlign: 'center' }))}
          type="button"
          title="Centrer"
        >
          <AlignCenter size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={getToolbarClass(editor.isActive({ textAlign: 'right' }))}
          type="button"
          title="Aligner à droite"
        >
          <AlignRight size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Liens et images */}
        <button
          onClick={addLink}
          className={getToolbarClass(editor.isActive('link'))}
          type="button"
          title="Ajouter un lien"
        >
          <LinkIcon size={16} />
        </button>
        <button
          onClick={addImage}
          className="p-1.5 sm:p-2 rounded hover:bg-gray-200 text-gray-700"
          type="button"
          title="Ajouter une image"
        >
          <ImageIcon size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Autres */}
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={getToolbarClass(editor.isActive('codeBlock'))}
          type="button"
          title="Bloc de code"
        >
          <Code size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={getToolbarClass(editor.isActive('blockquote'))}
          type="button"
          title="Citation"
        >
          <Quote size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 sm:p-2 rounded hover:bg-gray-200 text-gray-700"
          type="button"
          title="Ligne horizontale"
        >
          <Minus size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Nettoyer */}
        <button
          onClick={clearContent}
          className="p-1.5 sm:p-2 rounded hover:bg-gray-200 text-red-500"
          type="button"
          title="Effacer tout le contenu"
        >
          <Eraser size={16} />
        </button>
      </div>

      {/* Input pour le lien (affiché conditionnellement) */}
      {showLinkInput && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-blue-50 border-b border-blue-200">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://exemple.com"
            className="flex-1 min-w-[120px] px-2 sm:px-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const formattedUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
                if (linkUrl) {
                  editor.chain().focus().setLink({ href: formattedUrl }).run()
                }
                setShowLinkInput(false)
                setLinkUrl('')
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false)
                setLinkUrl('')
              }
            }}
          />
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (linkUrl) {
                  const formattedUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
                  editor.chain().focus().setLink({ href: formattedUrl }).run()
                }
                setShowLinkInput(false)
                setLinkUrl('')
              }}
              className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              type="button"
            >
              Ajouter
            </button>
            <button
              onClick={removeLink}
              className="p-1 text-red-500 hover:text-red-700"
              type="button"
              title="Supprimer le lien"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false)
                setLinkUrl('')
              }}
              className="p-1 text-gray-500 hover:text-gray-700"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Éditeur */}
      <EditorContent editor={editor} />

      {/* Placeholder personnalisé */}
      {!value && !disabled && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 text-gray-400 text-sm pointer-events-none -mt-[180px] sm:-mt-[200px]">
          {placeholder}
        </div>
      )}

      {/* Pied de page avec stats */}
      <div className="flex flex-wrap justify-between items-center gap-1 px-2 sm:px-4 py-1 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        <span>
          {editor.state.doc.textContent.length} caractères
        </span>
        <span>
          {editor.state.doc.nodeSize} caractères (HTML)
        </span>
      </div>
    </div>
  )
}