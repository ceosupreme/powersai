import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LogType, LogTypeField, FormField, LogSection } from '@/types/logs';

interface LogTypeFieldWithFormFields extends LogTypeField {
  form_fields: FormField;
}

export function useLogFields(logType: LogType | null) {
  return useQuery({
    queryKey: ['log-fields', logType],
    queryFn: async (): Promise<LogTypeFieldWithFormFields[]> => {
      if (!logType) return [];

      const { data, error } = await supabase
        .from('log_type_fields')
        .select(`
          *,
          form_fields (*)
        `)
        .eq('log_type', logType)
        .order('sort_order');

      if (error) throw error;
      
      // Parse options_json for each field
      return (data || []).map(field => ({
        ...field,
        form_fields: {
          ...field.form_fields,
          options_json: field.form_fields?.options_json 
            ? (typeof field.form_fields.options_json === 'string' 
                ? JSON.parse(field.form_fields.options_json) 
                : field.form_fields.options_json)
            : null,
        },
      })) as LogTypeFieldWithFormFields[];
    },
    enabled: !!logType,
  });
}

export function useLogSections(logType: LogType | null) {
  const { data: fields, ...rest } = useLogFields(logType);

  // Group fields by section
  const sections: LogSection[] = [];
  
  if (fields) {
    const sectionMap = new Map<string, LogSection>();
    
    fields.forEach(field => {
      if (!sectionMap.has(field.section)) {
        sectionMap.set(field.section, {
          name: field.section,
          fields: [],
        });
      }
      sectionMap.get(field.section)!.fields.push(field as LogTypeField & { form_fields: FormField });
    });

    // Convert map to array, maintaining order
    sectionMap.forEach(section => sections.push(section));
  }

  return { data: sections, ...rest };
}
