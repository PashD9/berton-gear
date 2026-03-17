import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useMediaStore = defineStore('media', () => {
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const status = ref('')

  const cloudName = import.meta.env.PHA_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.PHA_CLOUDINARY_UPLOAD_PRESET

  // New: Multi-upload action
  const uploadImages = async (files) => {
    if (!files || files.length === 0) return []

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary cloud name or upload preset not configured')
    }

    isUploading.value = true
    const uploadedUrls = []
    const totalFiles = files.length

    try {
      for (let i = 0; i < totalFiles; i++) {
        status.value = `Uploading image ${i + 1} of ${totalFiles}...`

        const formData = new FormData()
        formData.append('file', files[i])
        formData.append('upload_preset', uploadPreset)

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData, mode: 'cors' },
        )

        if (!response.ok) {
          const text = await response.text()
          console.error('Cloudinary returned non-ok response:', text)
          throw new Error(`Upload failed for file ${i + 1}`)
        }

        // Cloudinary should return JSON; wrap parse in try/catch to avoid CORB
        let data
        try {
          data = await response.json()
        } catch (parseError) {
          const text = await response.text()
          console.error('Failed to parse Cloudinary response as JSON:', text)
          throw parseError
        }

        uploadedUrls.push(data.secure_url)

        // Update progress based on files completed
        uploadProgress.value = Math.round(((i + 1) / totalFiles) * 100)
      }

      status.value = 'All uploads successful!'
      return uploadedUrls
    } catch (error) {
      status.value = 'Upload failed'
      console.error(error)
      throw error
    } finally {
      setTimeout(() => {
        isUploading.value = false
        uploadProgress.value = 0
      }, 2000)
    }
  }

  // --- DELETE PLACEHOLDER ---
  const deleteImage = async (url) => {
    // SECURITY NOTE: Deleting from Cloudinary requires the API Secret.
    // We cannot expose that in the frontend.
    // This serves as a placeholder for a future Cloud Function.
    return true
  }

  return { isUploading, uploadProgress, status, uploadImages, deleteImage }
})
