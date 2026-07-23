import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const FileUploader = ({
  label,
  name,
  onChange,
  multiple = false,
  accept = 'image/*',
  maxSize = 10,
  error,
}) => {
  const [previews, setPreviews] = useState([]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    // Validate files
    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size: ${maxSize}MB`);
        continue;
      }
      validFiles.push(file);
    }

    // Generate previews for images
    if (validFiles.length > 0) {
      const previewPromises = validFiles
        .filter(file => file.type.startsWith('image/'))
        .map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({ name: file.name, url: reader.result });
            };
            reader.readAsDataURL(file);
          });
        });

      const newPreviews = await Promise.all(previewPromises);
      setPreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
    }

    onChange(multiple ? validFiles : validFiles[0]);
  };

  const removeFile = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
        <input
          type="file"
          id={name}
          name={name}
          onChange={handleFileChange}
          {...(multiple && { multiple: true })}
          accept={accept}
          className="hidden"
        />
        <label htmlFor={name} className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Max file size: {maxSize}MB
          </p>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          {(previews || []).map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview.url}
                alt={preview.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default FileUploader;
