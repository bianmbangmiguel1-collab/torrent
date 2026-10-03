'use client';

export default function RolesHeaderActions() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-role-form'));
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
    >
      + Nouveau rôle
    </button>
  );
}