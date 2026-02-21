import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, uploadToPresignedUrl } from '../services/api';

interface UploadPhotosProps {
  eventId: string;
}

interface UploadResult {
  fileName: string;
  status: 'SUCCESS' | 'FAILED';
  message?: string;
}

const UploadPhotos: React.FC<UploadPhotosProps> = ({ eventId }) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState('');

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
  };

  const uploadAll = async () => {
    if (!eventId.trim()) {
      setError('Event is missing from link. Please open the photographer invite link again.');
      return;
    }

    if (files.length === 0) {
      setError('Select at least one photo.');
      return;
    }

    setError('');
    setIsUploading(true);
    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      try {
        const presigned = await api.presignPhotoUpload({
          eventId: eventId.trim(),
          contentType: file.type || 'image/jpeg'
        });

        await uploadToPresignedUrl(presigned.uploadUrl, file, file.type || 'image/jpeg');

        await api.confirmPhotoUpload({
          eventId: eventId.trim(),
          bucket: presigned.bucket,
          s3Key: presigned.s3Key
        });

        uploadResults.push({ fileName: file.name, status: 'SUCCESS' });
      } catch (requestError) {
        uploadResults.push({
          fileName: file.name,
          status: 'FAILED',
          message: requestError instanceof Error ? requestError.message : 'Upload failed'
        });
      }
    }

    setResults(uploadResults);
    setIsUploading(false);
  };

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        <header className="space-y-2">
          <Link to="/" className="text-stone-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mb-4">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h2 className="text-3xl font-bold text-stone-900">Photographer Upload</h2>
          <p className="text-stone-500">Upload event photos via backend presigned URL flow.</p>
        </header>

        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-stone-400 font-semibold">Event linked</p>
          <p className="text-sm text-stone-600">Upload photos for this event from your invite link.</p>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-stone-600 ml-1">Select Photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="w-full bg-white border border-stone-200 px-4 py-4 rounded-2xl"
          />
          <p className="text-sm text-stone-500">{files.length} file(s) selected</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          disabled={isUploading}
          onClick={uploadAll}
          className="w-full bg-stone-900 text-white py-5 rounded-2xl text-lg font-medium shadow-xl shadow-stone-200"
        >
          {isUploading ? 'Uploading...' : 'Upload and Confirm'}
        </button>

        {results.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-stone-800">Upload Results</h3>
            {results.map((result) => (
              <div key={`${result.fileName}-${result.status}`} className="text-sm">
                <span className="font-medium">{result.fileName}</span> -{' '}
                <span className={result.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>{result.status}</span>
                {result.message && <span className="text-stone-500"> ({result.message})</span>}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate('/')} className="w-full text-stone-500 font-medium py-2">
          Go to guest flow
        </button>
      </div>
    </Layout>
  );
};

export default UploadPhotos;
