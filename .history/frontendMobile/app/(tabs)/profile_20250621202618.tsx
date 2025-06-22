import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useGroups } from '@/hooks/useGroups'
import { appwriteDatabase } from '@/lib/appwrite'

interface PastPhoto {
    photoId: string;
    url: string;
    created: string;
}

const Profile = () => {
    const { user, logout } = useAuth();
    const { userProfile, isLoading: profileLoading, updateProfile } = useUserProfile();
    const { userGroups, isLoading: groupsLoading } = useGroups();
    const [userPhotos, setUserPhotos] = useState<PastPhoto[]>([]);
    const [photosLoading, setPhotosLoading] = useState<boolean>(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedUsername, setEditedUsername] = useState('');

    useEffect(() => {
        if (userProfile) {
            setEditedName(userProfile.name);
            setEditedUsername(userProfile.username);
        }
    }, [userProfile]);

    const handleSaveProfile = async () => {
        if (!userProfile) return;
        
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!editedUsername.trim() || editedUsername.length < 3) {
          Alert.alert('Error', 'Username must be at least 3 characters and contain only letters, numbers, dots, or underscores.');
          return;
        }
        if (!usernameRegex.test(editedUsername)) {
            Alert.alert('Error', 'Username can only contain letters, numbers, dots, and underscores');
            return;
        }
        
        try {
          const success = await updateProfile({ 
            name: editedName, 
            username: editedUsername 
          });
          if (success) {
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated!');
          } else {
            Alert.alert('Error', 'Failed to update profile. The username might already be taken.');
          }
        } catch (error) {
          Alert.alert('Error', 'An error occurred while updating the profile.');
        }
      };

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

      if (profileLoading || groupsLoading) {
        return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <Text style={{ color: Colors.dark_text, marginTop: 10 }}>Loading profile...</Text>
          </View>
        );
      }
    
      if (!userProfile) {
        return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: Colors.dark_text }}>Could not load profile.</Text>
          </View>
        );
      }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileBanner}>
          <Text style={styles.profileName}>{userProfile.name}</Text>
          <Text style={styles.profileUsername}>@{userProfile.username}</Text>
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
                            <Text style={styles.statValue}>{userProfile.totalPhotos ?? 0}</Text>
                        </View>
                        <Text style={styles.statLabel}>Photos Shared</Text>
                    </View>
                    <View style={styles.stat}>
                        <View style={styles.statValueContainer}>
                            <Text style={styles.statValue}>{userProfile.weeksActive ?? 0}</Text>
                        </View>
                        <Text style={styles.statLabel}>Weeks Active</Text>
                    </View>
                    <View style={styles.stat}>
                        <View style={styles.statValueContainer}>
                            <Text style={styles.statValue}>{userGroups.length}</Text>
                        </View>
                        <Text style={styles.statLabel}>Groups Joined</Text>
                    </View>
                </View>
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>profile info</Text>
                    <TouchableOpacity 
                        onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                        style={[styles.editButton, { backgroundColor: isEditing ? '#4CAF50' : Colors.orange }]}
                    >
                        <Text style={styles.editButtonText}>
                        {isEditing ? 'Save' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>name</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.textInput}
                            value={editedName}
                            onChangeText={setEditedName}
                        />
                    ) : (
                        <Text style={styles.infoValue}>{userProfile.name}</Text>
                    )}
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>email</Text>
                    <Text style={styles.infoValue}>{userProfile.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>username</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.textInput}
                            value={editedUsername}
                            onChangeText={setEditedUsername}
                            autoCapitalize="none"
                        />
                    ) : (
                        <Text style={styles.infoValue}>@{userProfile.username}</Text>
                    )}
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>member since</Text>
                    <Text style={styles.infoValue}>{userProfile.joinDate}</Text>
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
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark_text,
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
    textInput: {
        fontSize: 16,
        color: Colors.dark_text,
        borderBottomWidth: 1,
        borderColor: Colors.dark_text,
        minWidth: 150,
        textAlign: 'right',
    },
    editButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    editButtonText: {
        color: 'white',
        fontWeight: 'bold',
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
    logoutButton: {
        borderWidth: 1,
        borderColor: Colors.red,
        borderRadius: 20,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 30,
    },
    logoutButtonText: {
        color: Colors.red,
        fontSize: 16,
        fontWeight: 'bold',
    },
})

export default Profile; 