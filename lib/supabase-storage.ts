import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function uploadMapImage(file: File, templateId: number): Promise<string> {
  try {
    // Utwórz unikalną nazwę pliku
    const fileExt = file.name.split(".").pop()
    const fileName = `template-${templateId}-${Date.now()}.${fileExt}`
    const filePath = `maps/${fileName}`

    // Upload do Supabase Storage
    const { error } = await supabase.storage
      .from("triathlon-maps") // nazwa bucket'a
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      throw error
    }

    // Pobierz publiczny URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("triathlon-maps").getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error("Error uploading image:", error)
    throw error
  }
}

export async function deleteMapImage(imageUrl: string): Promise<void> {
  try {
    // Wyciągnij ścieżkę z URL
    const urlParts = imageUrl.split("/")
    const filePath = urlParts.slice(-2).join("/") // maps/filename.ext

    const { error } = await supabase.storage.from("triathlon-maps").remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error("Error deleting image:", error)
    throw error
  }
}
