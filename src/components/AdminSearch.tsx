import { Search } from 'lucide-react';

type AdminSearchProps = {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function AdminSearch({ onChange, placeholder, value }: AdminSearchProps) {
  return (
    <label className="searchBox">
      <Search size={17} aria-hidden="true" />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
