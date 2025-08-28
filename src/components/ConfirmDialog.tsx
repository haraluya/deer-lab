// src/components/ConfirmDialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="bg-white dark:bg-slate-900 border-2 shadow-xl" 
        style={{
          background: 'rgb(var(--toast-bg, 255 255 255))',
          color: 'rgb(var(--toast-text, 15 23 42))',
          borderColor: 'rgb(var(--toast-border, 226 232 240))',
        }}
        aria-describedby="confirm-dialog-description"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription id="confirm-dialog-description" className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" className="border-2">取消</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              onClick={onConfirm}
              className="font-semibold"
              style={{
                background: 'rgb(var(--toast-bg, 147 51 234))',
                color: 'rgb(var(--toast-text, 255 255 255))',
              }}
            >
              確認
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
