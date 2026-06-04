import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-medium tracking-tight">Settings</h1>
      <section className="card-shadow max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-1 font-semibold">Change password</h2>
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">
          Use a strong password — this account controls the whole site.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
