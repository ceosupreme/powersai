import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asanaToken = Deno.env.get('ASANA_ACCESS_TOKEN');
    if (!asanaToken) throw new Error('ASANA_ACCESS_TOKEN not configured');

    const body = await req.json();

    // User verification path
    if (body.type === 'user') {
      const gid = body.gid;
      if (!gid || typeof gid !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'User GID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(
        `https://app.asana.com/api/1.0/users/${gid}?opt_fields=name,email`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } },
      );

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: response.status === 404
            ? 'User not found. Check the GID.'
            : `Asana API error: ${response.status}`,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({
        success: true,
        name: data.data.name,
        email: data.data.email,
        type: 'user',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Section verification path
    if (body.type === 'section') {
      const gid = body.gid;
      if (!gid || typeof gid !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'Section GID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(
        `https://app.asana.com/api/1.0/sections/${gid}?opt_fields=name`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } },
      );

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: response.status === 404
            ? 'Section not found. Check the GID.'
            : `Asana API error: ${response.status}`,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({
        success: true,
        name: data.data.name,
        type: 'section',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Project test path
    if (body.type === 'project') {
      const gid = body.gid;
      if (!gid || typeof gid !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'Project GID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(
        `https://app.asana.com/api/1.0/projects/${gid}?opt_fields=name`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } },
      );

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: response.status === 404
            ? 'Project not found. Check the GID.'
            : `Asana API error: ${response.status}`,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({
        success: true,
        name: data.data.name,
        type: 'project',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Existing: task test path
    const { task_gid } = body;
    if (!task_gid || typeof task_gid !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'task_gid is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(
      `https://app.asana.com/api/1.0/tasks/${task_gid}?opt_fields=name,num_subtasks`,
      { headers: { 'Authorization': `Bearer ${asanaToken}` } },
    );

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: response.status === 404
          ? 'Task not found. Check the GID.'
          : `Asana API error: ${response.status}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({
      success: true,
      task_name: data.data.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
