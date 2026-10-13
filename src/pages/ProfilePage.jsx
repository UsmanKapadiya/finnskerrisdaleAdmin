import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PageHeader, Field, Card } from '../components/UI';
import { formatDate } from '../utils/format';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  const submit = async (which, body) => {
    setBusy(which);
    setErrors({});
    try {
      const res = await api.put('/admin/profile', body);
      setUser(res.data);
      toast(which === 'password' ? 'Password changed' : res.message);
      if (which === 'password') setPw({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      setErrors(err.errors || {});
      if (err.status !== 422) toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHeader title="Your profile" subtitle={`${user.role} · last sign-in ${formatDate(user.last_login_at, true)}`} />
      <div className="settings-grid">
        <Card title="Details">
          <form onSubmit={(e) => { e.preventDefault(); submit('details', form); }}>
            <Field label="Name" htmlFor="p-name" error={errors.name}>
              <input id="p-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email (used to sign in)" htmlFor="p-email" error={errors.email}>
              <input id="p-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <button type="submit" className="btn btn-primary" disabled={!!busy}>{busy === 'details' ? 'Saving…' : 'Save details'}</button>
          </form>
        </Card>
        <Card title="Change password">
          <form onSubmit={(e) => { e.preventDefault(); submit('password', pw); }}>
            <Field label="Current password" htmlFor="p-cur" error={errors.current_password}>
              <input id="p-cur" type="password" className="input" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required />
            </Field>
            <Field label="New password" htmlFor="p-new" error={errors.password} hint="At least 10 characters with letters and numbers.">
              <input id="p-new" type="password" className="input" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required />
            </Field>
            <Field label="Repeat new password" htmlFor="p-new2">
              <input id="p-new2" type="password" className="input" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} required />
            </Field>
            <button type="submit" className="btn btn-primary" disabled={!!busy}>{busy === 'password' ? 'Saving…' : 'Change password'}</button>
          </form>
        </Card>
      </div>
    </>
  );
}
