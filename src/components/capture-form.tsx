
"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import Image from 'next/image';
import { analyzePsleProblem, type AnalyzePsleProblemOutput } from '@/ai/flows/analyze-psle-problem';
import { addProblemToHistory } from '@/lib/local-storage';
import type { AnalyzedProblem } from '@/types/problem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, AlertCircle, CheckCircle, Sparkles, Camera as CameraIcon, Video, XCircle } from 'lucide-react';
import ProblemDetailsCard from './problem-details-card';
import { useToast } from "@/hooks/use-toast";

export default function CaptureForm() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzedProblem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setAnalysisResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview && !imageFile) { // Check both as webcam might only set preview initially
      setError("Please select or capture an image first.");
      toast({
        title: "No Image",
        description: "Please upload or capture an image of the exam problem.",
        variant: "destructive",
      });
      return;
    }
    // Prefer imagePreview if available (e.g. from webcam), else use imageFile to generate preview
    let imageDataUri = imagePreview;
    if (!imageDataUri && imageFile) {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      imageDataUri = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      setImagePreview(imageDataUri); // Set preview if it wasn't already
    }
    
    if (!imageDataUri) { // Final check
        setError("Image data is missing.");
        toast({ title: "Image Error", description: "Could not load image data for analysis.", variant: "destructive" });
        return;
    }


    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

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
      toast({
        title: "Analysis Complete!",
        description: "Problem analyzed and saved to history.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      console.error("Analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCamera = () => {
    if (isCameraOpen) {
      setIsCameraOpen(false);
      // Stream cleanup is handled by useEffect's return function when isCameraOpen changes
    } else {
      setIsCameraOpen(true);
      setImageFile(null);
      setImagePreview(null);
      setAnalysisResult(null);
      setError(null);
    }
  };

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const enableCameraStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        currentStream = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings and try again.',
        });
      }
    };

    if (isCameraOpen) {
      setHasCameraPermission(null); // Set to pending while requesting
      enableCameraStream();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setHasCameraPermission(null); // Reset permission status
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      // Ensure videoRef is also cleaned up if it somehow still holds a stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraOpen, toast]);

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          title: "Camera Not Ready",
          description: "Video stream has not loaded or has no dimensions. Please wait a moment and try again.",
          variant: "default",
        });
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setImagePreview(dataUrl);

        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "webcam-photo.png", { type: "image/png" });
            setImageFile(file); // Set imageFile for consistency, though handleAnalyze uses imagePreview
          });
        handleToggleCamera(); // Close camera view
      }
    } else {
      toast({
        title: "Capture Error",
        description: "Unable to take photo. Ensure camera is active and permission is granted.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full space-y-8">
      {!isCameraOpen && (
        <div className="space-y-4 p-6 border border-dashed rounded-lg shadow-sm bg-card">
          <Label htmlFor="problem-image" className="text-lg font-semibold text-center block text-foreground">
            Upload Exam Problem
          </Label>
          <Input
            id="problem-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file:text-primary file:font-semibold file:mr-2 hover:file:bg-primary/10"
            aria-describedby="image-help-text"
            disabled={isLoading}
          />
          <p id="image-help-text" className="text-xs text-muted-foreground text-center">
            Upload a clear picture of the exam problem.
          </p>
           <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="flex-shrink mx-4 text-muted-foreground text-sm">OR</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>
          <Button onClick={handleToggleCamera} variant="outline" className="w-full" aria-label="Take Photo with Webcam" disabled={isLoading}>
            <CameraIcon className="mr-2 h-5 w-5" />
            Take Photo with Webcam
          </Button>
        </div>
      )}

      {isCameraOpen && (
        <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-lg font-semibold text-center text-foreground">Webcam Capture</h3>
          <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-md bg-black">
            <video ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline />
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>

          {hasCameraPermission === null && (
             <Alert variant="default" className="shadow-md">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Awaiting Camera Permission</AlertTitle>
                <AlertDescription>
                  Please allow camera access in your browser.
                </AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === false && (
             <Alert variant="destructive" className="shadow-md">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                  Enable camera permissions in browser settings and refresh if needed.
                </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2 pt-2">
            <Button onClick={handleTakePhoto} disabled={!hasCameraPermission || isLoading} className="flex-1" aria-label="Snap Photo">
              <Video className="mr-2 h-5 w-5" />
              Snap Photo
            </Button>
            <Button onClick={handleToggleCamera} variant="outline" className="flex-1" aria-label="Cancel Webcam">
              <XCircle className="mr-2 h-5 w-5" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {imagePreview && !isCameraOpen && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center text-foreground">Image Preview</h3>
          <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-md">
            <Image src={imagePreview} alt="Problem preview" layout="fill" objectFit="contain" data-ai-hint="exam question" />
          </div>
        </div>
      )}

      {(imageFile || imagePreview) && !isCameraOpen && (
        <Button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md"
          aria-label="Analyze Problem"
        >
          {isLoading ? (
            <Sparkles className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-5 w-5" />
          )}
          {isLoading ? "Analyzing..." : "Analyze Problem"}
        </Button>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Progress value={undefined} className="w-full h-2 animate-pulse" />
          <p className="text-sm text-center text-primary">AI is working its magic... please wait.</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="shadow-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysisResult && !isCameraOpen && (
        <div className="mt-8">
          <ProblemDetailsCard problem={analysisResult} />
        </div>
      )}
    </div>
  );
}

    