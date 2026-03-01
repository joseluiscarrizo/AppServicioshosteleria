import { toast } from 'sonner';

export const useFormValidation = (schema) => {
  return (data) => {
    try {
      return schema.parse(data);
    } catch (error) {
      const messages = error.errors
        ? error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : error.message;
      toast.error('Error de validación: ' + messages);
      return null;
    }
  };
};
