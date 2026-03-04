import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Upload, Globe } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress'; // NOUVEAU : La barre de progression
import { createISO, uploadISO } from '../lib/api';

const createISOSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required'),
  arch: z.enum(['x86_64', 'aarch64', 'arm64', 'i686']),
  edition: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  download_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  checksum_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  checksum_type: z.enum(['sha256', 'sha512', 'md5']).optional(),
});

type CreateISOFormData = z.infer<typeof createISOSchema>;

interface AddIsoFormProps {
  onRefresh: () => void;
}

export function AddIsoForm({ onRefresh }: AddIsoFormProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'download' | 'upload'>('download');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // NOUVEAU : pourcentage

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<CreateISOFormData>({
    resolver: zodResolver(createISOSchema),
    defaultValues: {
      name: '',
      version: '',
      arch: 'x86_64',
      edition: '',
      category: 'Linux',
      download_url: '',
      checksum_url: '',
      checksum_type: 'sha256',
    },
  });

  const archValue = watch('arch');
  const checksumTypeValue = watch('checksum_type');
  const categoryValue = watch('category');

  const onFormSubmit = async (data: CreateISOFormData) => {
    try {
      if (mode === 'upload') {
        if (!file) {
          alert("Veuillez sélectionner un fichier ISO !");
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', data.name);
        formData.append('version', data.version);
        formData.append('arch', data.arch);
        formData.append('category', data.category);
        if (data.edition) formData.append('edition', data.edition);

        setUploadProgress(0);
        // NOUVEAU : On passe une fonction qui met à jour le pourcentage
        await uploadISO(formData, (percent) => {
          setUploadProgress(percent);
        });
      } else {
        await createISO(data as any);
      }
      reset();
      setFile(null);
      setUploadProgress(0);
      setOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create/upload ISO:', error);
      alert('Erreur lors de l\'ajout : ' + error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isSubmitting) setOpen(val);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add ISO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New ISO (isoman-plus)</DialogTitle>
        </DialogHeader>

        <div className="flex p-1 bg-muted rounded-md mb-2 mt-2">
          <Button type="button" variant={mode === 'download' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setMode('download')} disabled={isSubmitting}>
            <Globe className="w-4 h-4 mr-2" />
            Download URL
          </Button>
          <Button type="button" variant={mode === 'upload' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setMode('upload')} disabled={isSubmitting}>
            <Upload className="w-4 h-4 mr-2" />
            Local Upload
          </Button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1.5">Category *</label>
              <Select value={categoryValue} onValueChange={(value) => setValue('category', value)} disabled={isSubmitting}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Linux">Linux</SelectItem>
                  <SelectItem value="Windows">Windows</SelectItem>
                  <SelectItem value="Utility">Utility</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">Name *</label>
              <Input id="name" {...register('name')} placeholder="Alpine Linux" aria-invalid={!!errors.name} disabled={isSubmitting} />
            </div>

            <div>
              <label htmlFor="version" className="block text-sm font-medium mb-1.5">Version *</label>
              <Input id="version" {...register('version')} placeholder="3.19.1" aria-invalid={!!errors.version} disabled={isSubmitting} />
            </div>

            <div>
              <label htmlFor="arch" className="block text-sm font-medium mb-1.5">Architecture *</label>
              <Select value={archValue} onValueChange={(value) => setValue('arch', value as 'x86_64' | 'aarch64' | 'arm64' | 'i686')} disabled={isSubmitting}>
                <SelectTrigger id="arch"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="x86_64">x86_64</SelectItem>
                  <SelectItem value="aarch64">aarch64</SelectItem>
                  <SelectItem value="arm64">arm64</SelectItem>
                  <SelectItem value="i686">i686</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="edition" className="block text-sm font-medium mb-1.5">Edition</label>
              <Input id="edition" {...register('edition')} placeholder="minimal, desktop" disabled={isSubmitting} />
            </div>
          </div>

          {mode === 'download' ? (
            <div>
              <label htmlFor="download_url" className="block text-sm font-medium mb-1.5">Download URL *</label>
              <Input id="download_url" {...register('download_url')} placeholder="https://example.com/alpine.iso" className="font-mono text-sm" disabled={isSubmitting} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">Select ISO File *</label>
              <Input type="file" accept=".iso,.img,.zip" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
            </div>
          )}

          {/* NOUVEAU : La barre de progression s'affiche ici */}
          {mode === 'upload' && isSubmitting && (
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground font-medium">
                <span>Envoi du fichier en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {mode === 'upload' ? 'Uploading...' : 'Creating...'}</> : <><Plus className="w-4 h-4 mr-2" /> Confirm Add</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}