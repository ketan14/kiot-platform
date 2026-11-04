import React, { useState } from 'react';
import { X, MapPin, Building2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCreateLocation, useLocations } from '../../api/management';

interface LocationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultParentId?: string | null;
}

export const LocationCreateModal: React.FC<LocationCreateModalProps> = ({
  isOpen,
  onClose,
  defaultParentId = null,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'site' | 'building' | 'floor' | 'line' | 'room'>('line');
  const [parentId, setParentId] = useState<string>(defaultParentId || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: locations } = useLocations(false);
  const createLocationMutation = useCreateLocation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Location name is required.');
      return;
    }

    try {
      await createLocationMutation.mutateAsync({
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        type,
        parentId: parentId ? parentId : null,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setCode('');
        setType('line');
        setParentId('');
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create factory location.');
    }
  };

  const handleClose = () => {
    setName('');
    setCode('');
    setType('line');
    setParentId('');
    setErrorMessage(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Add Factory Location</h2>
              <p className="text-xs text-slate-400">Expand factory topological hierarchy</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Location created successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Location Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paint Shop Automated Line 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Location Code
              </label>
              <input
                type="text"
                placeholder="e.g. LINE-02"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hierarchy Level *
              </label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 capitalize"
              >
                <option value="site">Site / Campus</option>
                <option value="building">Building / Shed</option>
                <option value="floor">Floor</option>
                <option value="line">Production Line</option>
                <option value="room">Workcell / Room</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Parent Location Node (Optional)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- None (Top Level Site) --</option>
              {locations?.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  [{loc.type.toUpperCase()}] {loc.name} {loc.code ? `(${loc.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLocationMutation.isPending || success}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-400 text-white transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{createLocationMutation.isPending ? 'Creating...' : 'Create Location'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

