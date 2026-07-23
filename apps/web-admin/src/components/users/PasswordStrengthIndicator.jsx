import { getPasswordStrength } from '../../utils/passwordGenerator';

const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;

  const { score, strength, feedback } = getPasswordStrength(password);

  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-primary-500',
    'bg-green-500',
  ];

  const strengthColors = {
    'Very Weak': 'text-red-600',
    'Weak': 'text-orange-600',
    'Fair': 'text-yellow-600',
    'Good': 'text-primary-600',
    'Strong': 'text-green-600',
    'Very Strong': 'text-green-700',
  };

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded transition-colors ${
              i < score ? colors[score - 1] || colors[0] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strengthColors[strength] || 'text-gray-600'}`}>
        Strength: <span>{strength}</span>
      </p>
      {feedback.length > 0 && (
        <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1 list-disc list-inside">
          {(feedback || []).map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;

