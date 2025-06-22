import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/contexts/AuthContext'
import { appwriteDatabase } from '@/lib/appwrite'

interface PastPhoto {
    photoId: string;
    url: string;
    created: string;
}

const Profile = () => {
    const { user } = useAuth();
    const [userPhotos, setUserPhotos] = useState<PastPhoto[]>([]);
    const [photosLoading, setPhotosLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchPastPhotos = async () => {
          if (!user?.$id) return;
          try {
            setPhotosLoading(true);
            const docs: any[] = await appwriteDatabase.getUserPhotos(user.$id);
            const mapped: PastPhoto[] = await Promise.all(docs.map(async (doc: any) => {
              const photoId = doc.$id;
              const url = await appwriteDatabase.getPhotoUrl(photoId, 200, 200);
              return {
                photoId,
                url: url || '',
                created: (doc.$createdAt || doc.created) as string,
              };
            }));
            mapped.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
            setUserPhotos(mapped);
          } catch (err) {
            console.error('Error fetching past photos:', err);
          } finally {
            setPhotosLoading(false);
          }
        };
    
        fetchPastPhotos();
      }, [user?.$id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileBanner}>
          <Text style={styles.profileName}>Name name</Text>
          <Text style={styles.profileUsername}>@username</Text>
        </View>
        <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}/>
        </View>
      </View>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.contentContainer}>
            <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>your stats</Text>
                <View style={styles.stats}>
                    <View style={styles.stat}>
                        <View style={styles.statValueContainer}>
                            <Text style={styles.statValue}>127</Text>
                        </View>
                        <Text style={styles.statLabel}>Photos Shared</Text>
                    </View>
                    <View style={styles.stat}>
                        <View style={styles.statValueContainer}>
                            <Text style={styles.statValue}>1</Text>
                        </View>
                        <Text style={styles.statLabel}>Weeks Active</Text>
                    </View>
                    <View style={styles.stat}>
                        <View style={styles.statValueContainer}>
                            <Text style={styles.statValue}>2</Text>
                        </View>
                        <Text style={styles.statLabel}>Groups Joined</Text>
                    </View>
                </View>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.sectionTitle}>profile info</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>name</Text>
                    <Text style={styles.infoValue}>Name name</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>email</Text>
                    <Text style={styles.infoValue}>Email@email.com</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>username</Text>
                    <Text style={styles.infoValue}>@username</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>member since</Text>
                    <Text style={styles.infoValue}>Mon ##, ####</Text>
                </View>
            </View>
            <View style={styles.photosContainer}>
                <Text style={styles.sectionTitle}>view past photos</Text>
                {photosLoading ? (
                  <ActivityIndicator size="small" color={Colors.orange} />
                ) : userPhotos.length === 0 ? (
                  <Text style={{ opacity: 0.7, color: Colors.dark_text }}>No past photos yet.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {userPhotos.map((photo) => (
                      <View key={photo.photoId} style={styles.photoContainer}>
                        <Image
                          source={{ uri: photo.url }}
                          style={styles.photoThumbnail}
                          resizeMode="cover"
                        />
                        <Text style={styles.photoDate}>{new Date(photo.created).toLocaleDateString()}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
            </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    header: {
        backgroundColor: Colors.orange,
        height: 250,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'flex-end'
    },
    profileBanner: {
        backgroundColor: 'white',
        width: '90%',
        height: 150,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    profileImageContainer: {
        position: 'absolute',
        top: 30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.yellow,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.yellow,
    },
    profileName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.dark_text,
    },
    profileUsername: {
        fontSize: 16,
        color: Colors.dark_text,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark_text,
        marginBottom: 20,
    },
    statsContainer: {
        marginBottom: 30,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    statValueContainer: {
        backgroundColor: Colors.orange,
        paddingHorizontal: 25,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    statValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        color: Colors.dark_text,
        textAlign: 'center',
    },
    infoContainer: {
        marginBottom: 30,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    infoLabel: {
        fontSize: 16,
        color: Colors.orange,
        fontWeight: 'bold',
    },
    infoValue: {
        fontSize: 16,
        color: Colors.dark_text,
    },
    photosContainer: {},
    photoContainer: {
        marginRight: 12,
        alignItems: 'center',
    },
    photoThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: Colors.yellow,
    },
    photoDate: {
        fontSize: 10,
        marginTop: 4,
        opacity: 0.7,
        color: Colors.dark_text,
    },
})

export default Profile; 