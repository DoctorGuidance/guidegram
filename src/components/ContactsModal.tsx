import React, { useState, useEffect } from 'react'
import { X, Search, UserPlus, Phone, AtSign, Users } from 'lucide-react'
import { ContactItem } from '../types/telegram'
import { Avatar } from './Avatar'

interface ContactsModalProps {
  isOpen: boolean
  onClose: () => void
  accountId?: string
  onSelectContact: (contactId: string) => void
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  accountId,
  onSelectContact,
}) => {
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !accountId) return
    let isMounted = true
    setLoading(true)

    if (window.guidegram?.getContacts) {
      window.guidegram
        .getContacts(accountId)
        .then((list) => {
          if (isMounted && Array.isArray(list)) {
            setContacts(list)
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, accountId])

  if (!isOpen) return null

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const name = `${c.firstName} ${c.lastName || ''}`.toLowerCase()
    return (
      name.includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    )
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#17212b] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh] max-h-[600px] animate-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-accent-cyan" />
            <span className="font-bold text-base text-white">Contacts</span>
            <span className="text-xs text-gray-400 font-mono">({contacts.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading contacts...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              {search ? 'No matching contacts found' : 'No contacts available'}
            </div>
          ) : (
            filtered.map((c) => {
              const fullName = `${c.firstName} ${c.lastName || ''}`.trim() || 'Contact'
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectContact(c.id)
                    onClose()
                  }}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      accountId={accountId}
                      peerId={c.id}
                      title={fullName}
                      initials={fullName.charAt(0)}
                      avatarUrl={c.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-100 truncate">{fullName}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
                        {c.phone && <span>{c.phone}</span>}
                        {c.username && <span className="text-accent-cyan">@{c.username}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
