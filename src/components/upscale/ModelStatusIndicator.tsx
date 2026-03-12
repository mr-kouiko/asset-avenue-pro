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

export function ModelStatusIndicator({ state }: Props) {
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
      </div>

      {/* Model status message */}
      {state.statusMessage && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {statusIcons[state.modelStatus]}
          <span>{state.statusMessage}</span>
        </div>
      )}

      {/* Download progress */}
      {state.modelStatus === 'downloading' && (
        <div className="space-y-1">
          <Progress value={state.downloadProgress} className="h-2" />
          <p className="text-xs text-slate-500 text-right">{state.downloadProgress}%</p>
        </div>
      )}

      {/* Processing progress */}
      {state.isProcessing && state.processingProgress > 0 && (
        <div className="space-y-1">
          <Progress value={state.processingProgress} className="h-2" />
          <p className="text-xs text-slate-500 text-right">Processing: {state.processingProgress}%</p>
        </div>
      )}
    </div>
  );
}
