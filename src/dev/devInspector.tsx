import React from 'react';
import { BackendInspectorModal } from '../components/BackendInspectorModal';

interface DevInspectorProps {
  onClose: () => void;
}

export const DevInspector: React.FC<DevInspectorProps> = ({ onClose }) => {
  return <BackendInspectorModal onClose={onClose} />;
};
