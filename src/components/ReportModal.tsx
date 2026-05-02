import { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useContentReports } from '@/hooks/useContentReports';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

type ReportReason = 'copyright' | 'inappropriate' | 'misleading' | 'spam' | 'other';

interface ReportModalProps {
  submissionId: string;
  contentTitle: string;
  children?: React.ReactNode;
}

export const ReportModal = ({ submissionId, contentTitle, children }: ReportModalProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { submitReport, submitting } = useContentReports();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');

  const labels = {
    en: {
      reportContent: 'Report Content',
      reportDescription: 'Help us keep the community safe by reporting inappropriate content.',
      reportingTitle: 'Reporting:',
      selectReason: 'Select a reason',
      copyright: 'Copyright Infringement',
      copyrightDesc: 'This content uses copyrighted material without permission',
      inappropriate: 'Inappropriate Content',
      inappropriateDesc: 'Contains offensive or adult material',
      misleading: 'Misleading Preview',
      misleadingDesc: 'The preview doesn\'t match the actual content',
      spam: 'Spam or Scam',
      spamDesc: 'This appears to be spam or fraudulent',
      other: 'Other',
      otherDesc: 'Another issue not listed above',
      additionalDetails: 'Additional Details',
      detailsPlaceholder: 'Please provide more information about your report...',
      yourEmail: 'Your Email (for follow-up)',
      emailPlaceholder: 'email@example.com',
      cancel: 'Cancel',
      submit: 'Submit Report'
    },
    fr: {
      reportContent: 'Signaler le contenu',
      reportDescription: 'Aidez-nous à garder la communauté sûre en signalant les contenus inappropriés.',
      reportingTitle: 'Signalement de :',
      selectReason: 'Sélectionnez une raison',
      copyright: 'Violation de droits d\'auteur',
      copyrightDesc: 'Ce contenu utilise du matériel protégé sans autorisation',
      inappropriate: 'Contenu inapproprié',
      inappropriateDesc: 'Contient du matériel offensant ou pour adultes',
      misleading: 'Aperçu trompeur',
      misleadingDesc: 'L\'aperçu ne correspond pas au contenu réel',
      spam: 'Spam ou arnaque',
      spamDesc: 'Cela semble être du spam ou frauduleux',
      other: 'Autre',
      otherDesc: 'Un autre problème non listé ci-dessus',
      additionalDetails: 'Détails supplémentaires',
      detailsPlaceholder: 'Veuillez fournir plus d\'informations sur votre signalement...',
      yourEmail: 'Votre email (pour le suivi)',
      emailPlaceholder: 'email@example.com',
      cancel: 'Annuler',
      submit: 'Envoyer le signalement'
    }
  };

  const t = labels[language as 'en' | 'fr'] ?? labels.en;

  const reasons: { value: ReportReason; label: string; description: string }[] = [
    { value: 'copyright', label: t.copyright, description: t.copyrightDesc },
    { value: 'inappropriate', label: t.inappropriate, description: t.inappropriateDesc },
    { value: 'misleading', label: t.misleading, description: t.misleadingDesc },
    { value: 'spam', label: t.spam, description: t.spamDesc },
    { value: 'other', label: t.other, description: t.otherDesc },
  ];

  const handleSubmit = async () => {
    if (!reason) return;

    const success = await submitReport({
      submission_id: submissionId,
      reason,
      details: details || undefined,
      email: email || undefined
    });

    if (success) {
      setOpen(false);
      setReason('');
      setDetails('');
      setEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
            <Flag className="h-4 w-4" />
            {t.reportContent}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t.reportContent}
          </DialogTitle>
          <DialogDescription>
            {t.reportDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">{t.reportingTitle}</span>{' '}
            <span className="font-medium">{contentTitle}</span>
          </div>

          <div>
            <Label className="mb-2 block">{t.selectReason}</Label>
            <RadioGroup
              value={reason}
              onValueChange={(value) => setReason(value as ReportReason)}
              className="space-y-2"
            >
              {reasons.map((r) => (
                <div key={r.value} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                  <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                  <Label htmlFor={r.value} className="cursor-pointer flex-1">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="report-details">{t.additionalDetails}</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t.detailsPlaceholder}
              rows={3}
            />
          </div>

          {!user && (
            <div>
              <Label htmlFor="report-email">{t.yourEmail}</Label>
              <Input
                id="report-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!reason || submitting}>
            {submitting ? '...' : t.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
