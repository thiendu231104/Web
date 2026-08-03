export interface GuestContactItem {
  contact_id: string;
  phone: string;
  created_at?: string;
}

const GUEST_KEY = 'viettel_guest_contacts';

export const getGuestContactItems = (): GuestContactItem[] => {
  try {
    const data = localStorage.getItem(GUEST_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getGuestContactIds = (): string[] => {
  return getGuestContactItems().map(item => item.contact_id).filter(Boolean);
};

export const saveGuestContactId = (contactId: string, phone: string) => {
  try {
    if (!contactId || !phone) return;
    const items = getGuestContactItems();
    const exists = items.some(item => item.contact_id === contactId);
    if (!exists) {
      items.unshift({ contact_id: contactId, phone, created_at: new Date().toISOString() });
      localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    }
  } catch (e) {
    console.error('Failed to save guest contact to localStorage', e);
  }
};

export const removeGuestContactId = (contactId: string) => {
  try {
    const items = getGuestContactItems().filter(item => item.contact_id !== contactId);
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to remove guest contact from localStorage', e);
  }
};

export const clearGuestContactItems = () => {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch (e) {
    console.error('Failed to clear guest contacts from localStorage', e);
  }
};
