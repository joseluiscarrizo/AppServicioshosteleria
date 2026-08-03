import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response("Missing authorization", { status: 401 })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    )

    if (error || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ user: profile }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
