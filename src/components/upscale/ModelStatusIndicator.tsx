import type { AIUpscalerState } from '@/hooks/useAIUpscaler';
import { Progress } from '@/components/ui/progress';
import {
  Cpu,
  Zap,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MonitorSmartphone,
  ScanFace,
  UserCheck,
} from 'lucide-react';

interface Props {
  state: AIUpscalerState;
}

const backendIcons: Record<string, React.ReactNode> = {
  webgpu: <Zap className="w-4 h-4 text-green-400" />,
  webgl: <Zap className="w-4 h-4 text-yellow-400" />,
  cpu: <Cpu className="w-4 h-4 text-blue-400" />,
  'canvas-only': <MonitorSmartphone className="w-4 h-4 text-slate-400" />,
};

const statusIcons: Record<string, React.ReactNode> = {
  idle: null,
  'checking-cache': <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
  downloading: <Download className="w-4 h-4 text-blue-400" />,
  loading: <Loader2 className="w-4 h-4 animate-spin text-purple-400" />,
  ready: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  error: <AlertTriangle className="w-4 h-4 text-red-400" />,
  unsupported: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
};

const faceStatusLabels: Record<string, { icon: React.ReactNode; text: string } | null> = {
  idle: null,
  'downloading-model': { icon: <Download className="w-4 h-4 text-pink-400" />, text: 'Downloading face model…' },
  'loading-model': { icon: <Loader2 className="w-4 h-4 animate-spin text-pink-400" />, text: 'Loading GFPGAN…' },
  'model-ready': { icon: <CheckCircle2 className="w-4 h-4 text-pink-400" />, text: 'Face model ready' },
  'detecting-faces': { icon: <ScanFace className="w-4 h-4 text-pink-400 animate-pulse" />, text: 'Detecting faces…' },
  'enhancing-faces': { icon: <ScanFace className="w-4 h-4 text-pink-400 animate-pulse" />, text: 'Enhancing faces…' },
  'blending': { icon: <Loader2 className="w-4 h-4 animate-spin text-pink-400" />, text: 'Blending restored faces…' },
  'complete': { icon: <UserCheck className="w-4 h-4 text-green-400" />, text: 'Face enhancement complete' },
  'no-faces': { icon: <ScanFace className="w-4 h-4 text-slate-400" />, text: 'No faces detected' },
  error: { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, text: 'Face enhancement failed' },
  skipped: { icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />, text: 'Face enhancement skipped' },
};

export function ModelStatusIndicator({ state }: Props) {
  const faceInfo = faceStatusLabels[state.faceEnhanceStatus];

  return (
    <div className="space-y-3">
      {/* Backend badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
          {backendIcons[state.backend]}
          {state.backend === 'webgpu' && 'WebGPU Accelerated'}
          {state.backend === 'webgl' && 'WebGL Accelerated'}
          {state.backend === 'cpu' && 'CPU Processing'}
          {state.backend === 'canvas-only' && 'Basic Mode'}
        </span>

        {state.gpuAccelerated && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs text-green-400 font-medium">
            <Zap className="w-3 h-3" /> GPU Enabled
          </span>
        )}

        {state.facesDetected > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-xs text-pink-400 font-medium">
            <ScanFace className="w-3 h-3" /> {state.facesDetected} face(s)
          </span>
        )}
      </div>

      {/* Model status message */}
      {state.statusMessage && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {statusIcons[state.modelStatus]}
          <span>{state.statusMessage}</span>
        </div>
      )}

      {/* Face enhancement status */}
      {faceInfo && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {faceInfo.icon}
          <span>{faceInfo.text}</span>
        </div>
      )}

      {/* ESRGAN download progress */}
      {state.modelStatus === 'downloading' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ESRGAN Model</span>
            <span>{state.downloadProgress}%</span>
          </div>
          <Progress value={state.downloadProgress} className="h-2" />
        </div>
      )}

      {/* GFPGAN download progress */}
      {state.faceEnhanceStatus === 'downloading-model' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>GFPGAN Face Model</span>
            <span>{state.faceModelDownloadProgress}%</span>
          </div>
          <Progress value={state.faceModelDownloadProgress} className="h-2" />
        </div>
      )}

      {/* Processing progress */}
      {state.isProcessing && state.processingProgress > 0 && state.modelStatus !== 'downloading' && (
        <div className="space-y-1">
          <Progress value={state.processingProgress} className="h-2" />
          <p className="text-xs text-slate-500 text-right">Processing: {state.processingProgress}%</p>
        </div>
      )}
    </div>
  );
}
