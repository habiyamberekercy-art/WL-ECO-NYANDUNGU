import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, MapPin, Upload, FileText } from 'lucide-react';
import { Card, Toast } from './Header';
import { useApp } from '@/lib/app-context';
import { supabase, type ParkZone, type ReportType, type ReportSeverity } from '@/lib/supabase';
import { REPORT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/lib/types';

interface ReportFormProps {
  zones: ParkZone[];
  onDone: () => void;
}

export default function ReportForm({ zones, onDone }: ReportFormProps) {
  const { t } = useApp();
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    report_type: 'sewage_inflow' as ReportType,
    description: '',
    location_zone_id: '',
    location_description: '',
    severity: 'low' as ReportSeverity,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const simulateUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    setFileName('incident_photo.jpg');
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!form.reporter_name.trim() || !form.description.trim()) {
      setError('Please provide your name and a description of the incident.');
      setSubmitting(false);
      return;
    }

    const payload: Record<string, string | null> = {
      reporter_name: form.reporter_name.trim(),
      reporter_email: form.reporter_email.trim(),
      report_type: form.report_type,
      description: form.description.trim(),
      location_description: form.location_description.trim(),
      severity: form.severity,
      image_url: fileName ? `simulated://incident_photo.jpg` : null,
    };

    if (form.location_zone_id) {
      payload.location_zone_id = form.location_zone_id;
    }

    const { error: insertError } = await supabase.from('incident_reports').insert(payload);

    if (insertError) {
      setError('Failed to submit report. Please try again.');
      setSubmitting(false);
    } else {
      setSuccess(true);
      setToast(true);
      setSubmitting(false);
      setTimeout(() => setToast(false), 3000);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('reportSuccess')}</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">{t('reportSuccessMsg')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false);
                setForm({
                  reporter_name: '', reporter_email: '', report_type: 'sewage_inflow',
                  description: '', location_zone_id: '', location_description: '', severity: 'low',
                });
                setFileName('');
                setUploadProgress(0);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-sm"
            >
              {t('submitAnother')}
            </button>
            <button onClick={onDone} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition-colors text-sm">
              {t('backToDashboard')}
            </button>
          </div>
        </Card>
        <Toast message={t('reportSuccess')} show={toast} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('reportTitle')}</h1>
        <p className="text-slate-500">{t('reportSubtitle')}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('reporterName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text" required
                value={form.reporter_name}
                onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                placeholder="Mukamana Alice"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('reporterEmail')}</label>
              <input
                type="email"
                value={form.reporter_email}
                onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                placeholder="alice@example.rw"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('reportType')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(REPORT_TYPE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key} type="button"
                  onClick={() => setForm({ ...form, report_type: key as ReportType })}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                    form.report_type === key
                      ? 'border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-teal-500/20'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Related Zone (optional)</label>
            <select
              value={form.location_zone_id}
              onChange={(e) => setForm({ ...form, location_zone_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
            >
              <option value="">General / Not zone-specific</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('description')} <span className="text-red-500">*</span></label>
            <textarea
              required rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 resize-none"
              placeholder="Describe what you observed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('locationDescription')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.location_description}
                onChange={(e) => setForm({ ...form, location_description: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                placeholder="e.g., Near Pond 1, eastern inlet"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('severity')}</label>
            <div className="flex gap-2">
              {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key} type="button"
                  onClick={() => setForm({ ...form, severity: key as ReportSeverity })}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.severity === key
                      ? `border-current ${cfg.color} ring-2`
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simulated file upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('attachPhoto')}</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
              {!fileName && !uploading && (
                <button
                  type="button"
                  onClick={simulateUpload}
                  className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {t('uploadSimulated')} — Click to simulate
                </button>
              )}
              {uploading && (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-teal-600 animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{fileName}</span>
                      <span className="text-slate-400">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                </div>
              )}
              {fileName && !uploading && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">{fileName}</span>
                  <span className="text-xs text-slate-400">({t('uploadSimulated')})</span>
                  <button type="button" onClick={() => { setFileName(''); setUploadProgress(0); }} className="ml-auto text-xs text-slate-400 hover:text-red-500">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            {submitting ? t('submitting') : (
              <><Send className="w-4 h-4" /> {t('submitReport')}</>
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}
