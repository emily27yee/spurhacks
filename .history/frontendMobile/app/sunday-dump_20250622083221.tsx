import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { Colors } from '@/constants/Colors'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { appwriteDatabase } from '@/lib/appwrite'
import * as MediaLibrary from 'expo-media-library'
import { captureRef } from 'react-native-view-shot'

export default function SundayDump() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const [story, setStory] = useState<string[]>([])
    const [photos, setPhotos] = useState<Array<{url: string, caption: string}>>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const photoRefs = useRef<Array<any>>([])

    const groupId = params.groupId as string
    const groupName = params.groupName as string

    useEffect(() => {
        if (groupId) {
            generateStory()
        }
    }, [groupId])

    const generateStory = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch group photos
            const groupData = await appwriteDatabase.getGroupData(groupId)
            
            // Load Photos from todaydata
            let todayData: Record<string, string> = {}
            if (groupData.todaydata) {
                try {
                    todayData = JSON.parse(groupData.todaydata)
                } catch (e) { 
                    console.error('Error parsing todaydata:', e)
                }
            }
            
            // Get all photo URLs and convert to base64
            const photoData: Array<{data: string, mimeType: string, url: string}> = []
            for (const [userId, photoId] of Object.entries(todayData)) {
                try {
                    const photoUrl = await appwriteDatabase.getPhotoUrl(photoId)
                    if (photoUrl) {
                        // Fetch the image and convert to base64
                        const response = await fetch(photoUrl)
                        const blob = await response.blob()
                        
                        // Convert blob to base64
                        const reader = new FileReader()
                        const base64Data = await new Promise<string>((resolve, reject) => {
                            reader.onloadend = () => {
                                const result = reader.result as string
                                // Remove the data:image/jpeg;base64, prefix
                                const base64 = result.split(',')[1]
                                resolve(base64)
                            }
                            reader.onerror = reject
                            reader.readAsDataURL(blob)
                        })
                        
                        // Determine mime type from blob
                        const mimeType = blob.type || 'image/jpeg'
                        
                        photoData.push({
                            data: base64Data,
                            mimeType: mimeType,
                            url: photoUrl
                        })
                    }
                } catch (photoError) {
                    console.error(`Error loading photo ${photoId}:`, photoError)
                }
            }

            if (photoData.length === 0) {
                setError('No photos found for this group today.')
                setLoading(false)
                return
            }
            
            // Initialize Gemini
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY
            if (!apiKey) {
                throw new Error('Gemini API key not found. Please check your environment variables.')
            }
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
            
            // Create prompt for story generation with images
            const prompt = `Look at these ${photoData.length} photos from a group of friends. For each photo, write exactly ONE sentence that describes what's happening or creates a funny story element. 

            Requirements:
            - Write exactly one sentence per photo
            - Number each sentence (1., 2., 3., etc.)
            - Make each sentence funny and entertaining
            - Each sentence should work as a caption for that specific photo
            - Don't include any introductory text or explanations
            - Just provide the numbered sentences, nothing else
            - Keep all content completely appropriate and family-friendly
            
            Important: Ensure the story is funny. A genuinely funny story is surprising, relatable, and emotionally honest — it builds naturally, respects the audience's intelligence, and doesn't try too hard. Corny stories feel forced, predictable, or overly explained, often relying on clichés instead of real character or situational humor. Additionally, ensure that the story avoids anything inappropriate and maintains a wholesome, clean tone suitable for all audiences.`// Prepare the content array with text prompt and images
            const contentParts: any[] = [
                { text: prompt }
            ]

            // Add each image to the content
            photoData.forEach((photo, index) => {
                contentParts.push({
                    inlineData: {
                        data: photo.data,
                        mimeType: photo.mimeType
                    }
                })
            })

            console.log(`Sending ${photoData.length} images to Gemini...`)
            const result = await model.generateContent(contentParts)
            const response = await result.response
            const storyText = response.text()

            console.log('Gemini response:', storyText)

            // Parse the numbered sentences
            const sentences = storyText
                .split(/\d+\.\s/)
                .filter(sentence => sentence.trim().length > 0)
                .map(sentence => sentence.trim())

            // Match photos with their captions
            const photosWithCaptions = photoData.map((photo, index) => ({
                url: photo.url,
                caption: sentences[index] || 'No caption generated'
            }))

            setPhotos(photosWithCaptions)
            setStory(sentences)
        } catch (err) {
            console.error('Error generating story:', err)
            setError('Failed to generate story. Please try again.')        } finally {
            setLoading(false)
        }
    }

    const handleGoBack = () => {
        router.back()
    }

    const saveStory = async () => {
        try {
            setSaving(true)
            
            // TODO: Install expo-media-library and react-native-view-shot first
            // Request permission to access media library
            const { status } = await MediaLibrary.requestPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to save photos to your camera roll.')
                return
            }

            //Capture each photo with caption
            for (let i = 0; i < photos.length; i++) {
                if (photoRefs.current[i]) {
                    const uri = await captureRef(photoRefs.current[i], {
                        format: 'png',
                        quality: 1,
                    })
                    
                    // Save to camera roll
                    await MediaLibrary.saveToLibraryAsync(uri)
                }
            }

            //Alert.alert('Coming Soon!', 'Save functionality will be available after installing required packages.')
        } catch (error) {
            console.error('Error saving story:', error)
            Alert.alert('Error', 'Failed to save photos. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <View style={styles.container}>
            {/* Top section with title and back button */}
            <View style={styles.topSection}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Text style={styles.backButtonText}>Go back to Groups</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Daily Dump</Text>
                {groupName && <Text style={styles.groupName}>{groupName}</Text>}
            </View>            {/* Main content area */}
            <ScrollView style={styles.contentArea} contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.orange} />
                        <Text style={styles.loadingText}>Generating your story...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={generateStory}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>                ) : photos.length > 0 ? (
                    <View style={styles.photosContainer}>
                        <Text style={styles.instructionText}>
                            Sit back and let AI turn your photos into funny captions you can share with friends!
                        </Text>                        {photos.map((photo, index) => (
                            <View 
                                key={index} 
                                style={styles.photoContainer}
                                ref={(ref) => { photoRefs.current[index] = ref }}
                            >
                                <Image 
                                    source={{ uri: photo.url }} 
                                    style={styles.photo}
                                    resizeMode="cover"
                                />
                                <Text style={styles.photoCaption}>{photo.caption}</Text>
                            </View>                        ))}
                        
                        {/* Save Story Button */}
                        <TouchableOpacity 
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                            onPress={saveStory}
                            disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? 'Saving...' : 'Save Story'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>No story generated yet...</Text>
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    topSection: {
        backgroundColor: Colors.orange,
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
        alignItems: 'center',
    },    backButton: {
        position: 'absolute',
        top: 45,
        left: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    backButtonText: {
        color: Colors.dark_text,
        fontSize: 14,
        fontWeight: 'bold',
    },    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
        textTransform: 'lowercase',
    },
    groupName: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center',
        marginTop: 5,
        opacity: 0.9,
    },
    contentArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: Colors.dark_text,
        marginTop: 15,
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        fontSize: 16,
        color: Colors.red,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: Colors.orange,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },    storyContainer: {
        flex: 1,
    },    photosContainer: {
        flex: 1,
    },
    instructionText: {
        fontSize: 16,
        color: Colors.dark_text,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 15,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    photoContainer: {
        marginBottom: 25,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    photo: {
        width: '100%',
        height: 250,
        borderRadius: 15,
        marginBottom: 10,
    },    photoCaption: {
        fontSize: 16,
        color: Colors.dark_text,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    saveButton: {
        backgroundColor: Colors.orange,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonDisabled: {
        backgroundColor: Colors.dark_text,
        opacity: 0.6,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    storyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark_text,
        textAlign: 'center',
        marginBottom: 20,
    },
    sentenceContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        padding: 15,
        backgroundColor: 'white',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sentenceNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.orange,
        marginRight: 10,
        minWidth: 25,
    },
    sentenceText: {
        fontSize: 16,
        color: Colors.dark_text,
        flex: 1,
        lineHeight: 22,
    },
    placeholderText: {
        fontSize: 18,
        color: Colors.dark_text,
        textAlign: 'center',
        fontStyle: 'italic',
    },
})
