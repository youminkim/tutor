
"use client";

import { useState, type ChangeEvent, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { analyzePsleProblem, type AnalyzePsleProblemOutput } from '@/ai/flows/analyze-psle-problem';
import { addProblemToHistory } from '@/lib/local-storage';
import type { AnalyzedProblem } from '@/types/problem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, AlertCircle, CheckCircle, Sparkles, Camera as CameraIcon, Video, RefreshCcw, FileUp } from 'lucide-react';
import ProblemDetailsCard from './problem-details-card';
import { useToast } from "@/hooks/use-toast";

type UiMode = 'camera_pending' | 'camera_active' | 'camera_denied' | 'upload_mode' | 'analyzing' | 'results';

export default function CaptureForm() {
  const [uiMode, setUiMode] = useState<UiMode>('camera_pending');
  const [imageFile, setImageFile] = useState<File | null>(null); // For potential direct use, though dataURI is primary
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Data URI
  const [analysisResult, setAnalysisResult] = useState<AnalyzedProblem | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [shouldAutoPlaySpeech, setShouldAutoPlaySpeech] = useState<boolean>(false);

  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasCameraPermissionInternal, setHasCameraPermissionInternal] = useState<boolean | null>(null);

  // Request camera permission and set up stream
  const setupCamera = useCallback(async () => {
    if (hasCameraPermissionInternal === true && videoRef.current?.srcObject) {
      // Camera already set up and permission granted
      setUiMode('camera_active');
      return;
    }
    setUiMode('camera_pending');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermissionInternal(true);
      setUiMode('camera_active');
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermissionInternal(false);
      setUiMode('camera_denied');
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions or use file upload.',
      });
    }
  }, [toast, hasCameraPermissionInternal]);

  useEffect(() => {
    // Attempt to set up camera on initial mount if no analysis result exists
    if (!analysisResult && !imagePreview) {
      setupCamera();
    }
    // Cleanup stream on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [setupCamera, analysisResult, imagePreview]);


  const runAnalysis = useCallback(async (imageDataUri: string) => {
    setUiMode('analyzing');
    setAnalysisError(null);
    // analysisResult is cleared by handleStartOver or before new analysis
    
    try {
      const result: AnalyzePsleProblemOutput = await analyzePsleProblem({ problemImage: imageDataUri });
      const newAnalyzedProblem: AnalyzedProblem = {
        id: new Date().toISOString(),
        problemImageUri: imageDataUri,
        advice: result.advice,
        concepts: result.concepts,
        timestamp: Date.now(),
      };

      setAnalysisResult(newAnalyzedProblem);
      addProblemToHistory(newAnalyzedProblem);
      setUiMode('results');
      toast({
        title: "Analysis Complete!",
        description: "Problem analyzed and saved to history.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      console.error("Analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setAnalysisError(errorMessage);
      setUiMode(imagePreview ? 'camera_active' : 'upload_mode'); // Go back to appropriate mode before analysis
      // If imagePreview exists, it means we were likely in camera_active or had an upload.
      // If no imagePreview, means upload failed early or something unexpected.
      setShouldAutoPlaySpeech(false); // Don't autoplay if analysis failed
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSnapAnalyzeAndRead = async () => {
    if (videoRef.current && canvasRef.current && hasCameraPermissionInternal) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0 || video.videoHeight === 0) {
        toast({ title: "Camera Not Ready", description: "Video stream has not loaded. Please wait and try again." });
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setImagePreview(dataUrl);

        // Stop camera stream after taking photo
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        fetch(dataUrl).then(res => res.blob()).then(blob => {
          setImageFile(new File([blob], "webcam-photo.png", { type: "image/png" }));
        });
        
        setShouldAutoPlaySpeech(true);
        runAnalysis(dataUrl);
      }
    } else {
      toast({ title: "Capture Error", description: "Unable to snap photo.", variant: "destructive" });
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setShouldAutoPlaySpeech(false);
        runAnalysis(dataUrl);
      };
      reader.readAsDataURL(file);
    }
     // Reset file input to allow uploading the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleStartOver = () => {
    setAnalysisResult(null);
    setImagePreview(null);
    setImageFile(null);
    setAnalysisError(null);
    setShouldAutoPlaySpeech(false);
    setHasCameraPermissionInternal(null); // This will trigger setupCamera via useEffect dependency if needed
    // Explicitly call setupCamera to re-initiate camera attempt
    setupCamera(); // This will set uiMode to camera_pending then active/denied
  };

  const switchToUploadMode = () => {
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    setHasCameraPermissionInternal(false); // Effectively marks camera as not the go-to
    setUiMode('upload_mode');
  };


  if (uiMode === 'results' && analysisResult) {
    return (
      <div className="w-full space-y-6">
        <ProblemDetailsCard problem={analysisResult} autoPlaySpeech={shouldAutoPlaySpeech} />
        <Button onClick={handleStartOver} variant="outline" className="w-full">
          <RefreshCcw className="mr-2 h-5 w-5" />
          Start Over
        </Button>
      </div>
    );
  }

  if (uiMode === 'analyzing') {
    return (
      <div className="w-full space-y-4 text-center py-10">
        <Sparkles className="mx-auto h-12 w-12 text-primary animate-spin" />
        <p className="text-lg font-semibold text-primary">AI is working its magic...</p>
        <Progress value={undefined} className="w-full h-2 animate-pulse" />
        {imagePreview && (
             <div className="mt-4 relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-md">
                <Image src={imagePreview} alt="Problem preview for analysis" layout="fill" objectFit="contain" data-ai-hint="exam question" />
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <canvas ref={canvasRef} className="hidden"></canvas>

      {analysisError && (
        <Alert variant="destructive" className="shadow-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{analysisError}</AlertDescription>
        </Alert>
      )}
      
      {(uiMode === 'camera_pending' || uiMode === 'camera_active' || (uiMode === 'camera_denied' && hasCameraPermissionInternal === null) ) && !imagePreview && (
         <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <h3 className="text-lg font-semibold text-center text-foreground">Webcam Capture</h3>
            {uiMode === 'camera_pending' && (
                <Alert variant="default" className="shadow-md">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Initializing Camera</AlertTitle>
                    <AlertDescription>
                    Please allow camera access in your browser.
                    </AlertDescription>
                </Alert>
            )}
             <div className={`relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-md bg-muted ${uiMode !== 'camera_active' ? 'flex items-center justify-center min-h-[200px]' : ''}`}>
                <video ref={videoRef} className={`w-full h-full object-contain ${uiMode !== 'camera_active' ? 'hidden' : ''}`} autoPlay muted playsInline />
                {uiMode === 'camera_pending' && <CameraIcon className="h-16 w-16 text-muted-foreground animate-pulse" />}
             </div>

            {uiMode === 'camera_active' && hasCameraPermissionInternal && (
                <Button onClick={handleSnapAnalyzeAndRead} className="w-full text-lg py-6">
                    <CameraIcon className="mr-2 h-5 w-5" />
                    Snap, Analyze & Read Aloud
                </Button>
            )}
            <Button onClick={switchToUploadMode} variant="outline" size="sm" className="w-full">
                <FileUp className="mr-2 h-4 w-4" /> Use File Upload Instead
            </Button>
         </div>
      )}

      {(uiMode === 'upload_mode' || (uiMode === 'camera_denied' && hasCameraPermissionInternal === false)) && !imagePreview && (
        <div className="space-y-4 p-6 border border-dashed rounded-lg shadow-sm bg-card">
            {uiMode === 'camera_denied' && hasCameraPermissionInternal === false && (
                 <Alert variant="destructive" className="shadow-md">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                    To use the webcam, please enable camera permissions in your browser settings and click "Start Over" or refresh the page. Otherwise, you can upload an image.
                    </AlertDescription>
                </Alert>
            )}
          <Label htmlFor="problem-image-upload" className="text-lg font-semibold text-center block text-foreground">
            Upload Exam Problem
          </Label>
          <Input
            id="problem-image-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="file:text-primary file:font-semibold file:mr-2 hover:file:bg-primary/10"
            aria-describedby="image-help-text"
          />
          <p id="image-help-text" className="text-xs text-muted-foreground text-center">
            Select a clear picture of the exam problem. Analysis will start automatically.
          </p>
          {hasCameraPermissionInternal !== true && ( // Show option to try camera if not actively denied this session or if permission unknown
            <Button onClick={handleStartOver} variant="outline" size="sm" className="w-full">
                <CameraIcon className="mr-2 h-4 w-4" /> Try Webcam Again
            </Button>
          )}
        </div>
      )}

      {/* This image preview is mostly for when analysis is triggered and we want to show what's being analyzed,
          or if analysis fails and user sees what they submitted.
          The main display logic is handled by uiMode now.
          This block might be redundant if 'analyzing' and 'results' views handle their own previews.
          Let's keep it for debugging or potential brief display between states.
      */}
      {imagePreview && uiMode !== 'results' && uiMode !== 'analyzing' && (
         <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center text-foreground">Selected Image</h3>
          <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-md">
            <Image src={imagePreview} alt="Problem preview" layout="fill" objectFit="contain" data-ai-hint="exam problem" />
          </div>
           <Button onClick={handleStartOver} variant="outline" className="w-full">
                <RefreshCcw className="mr-2 h-5 w-5" />
                Clear and Restart
            </Button>
        </div>
      )}
    </div>
  );
}
