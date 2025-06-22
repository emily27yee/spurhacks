import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { Colors } from '@/constants/Colors'
import { useGroups, type Group } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import NavigationButtons from '@/components/NavigationButtons';
import { appwriteDatabase } from '@/lib/appwrite';
import { useRouter } from 'expo-router'

const { width } = Dimensions.get('window');

const GroupDisplay = ({ group, onLeave, showLeftArrow, showRightArrow, onPressLeft, onPressRight }: { group: Group, onLeave: (group: Group) => void, showLeftArrow: boolean, showRightArrow: boolean, onPressLeft: () => void, onPressRight: () => void }) => {
    const [groupPhotos, setGroupPhotos] = useState<Array<{id: string, userId: string, uri: string}>>([]);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [photoComments, setPhotoComments] = useState<Record<string, string>>({});
    const [loadingPhoto, setLoadingPhoto] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadGroupPhoto();
    }, [group.$id]);
    
    const loadGroupPhoto = async () => {
        try {
            setLoadingPhoto(true);
            const groupData = await appwriteDatabase.getGroupData(group.$id);
            
            // Load Photos from todaydata
            let todayData: Record<string, string> = {};
            if (groupData.todaydata) {
                try {
                    todayData = JSON.parse(groupData.todaydata);
                } catch (e) { 
                    console.error('Error parsing todaydata:', e); 
                }
            }
            
            // Load Comments from todaycomments
            let todayComments: Record<string, { assignedPhotoId: string, comment: string }> = {};
            if (groupData.todaycomments) {
                try {
                    todayComments = JSON.parse(groupData.todaycomments);
                } catch (e) { 
                    console.error('Error parsing todaycomments:', e); 
                }
            }
              // Load all photos
            const photos = [];
            const comments: Record<string, string> = {};
            
            for (const [userId, photoId] of Object.entries(todayData)) {
                try {
                    const photoUrl = await appwriteDatabase.getPhotoUrl(photoId);
                    console.log(`Loaded photo for user ${userId}: ${photoUrl ? 'URL received' : 'No URL'}`);
                    photos.push({ id: photoId, userId: userId, uri: photoUrl });
                    
                    // Find comment for this photo
                    const commentForPhoto = Object.values(todayComments).find(
                        comment => comment.assignedPhotoId === photoId && comment.comment?.trim()
                    );
                    
                    if (commentForPhoto) {
                        comments[photoId] = commentForPhoto.comment;
                    }
                } catch (photoError) {
                    console.error(`Error loading photo ${photoId}:`, photoError);
                }
            }
            
            console.log(`Total photos loaded: ${photos.length}`);
            setGroupPhotos(photos);
            setPhotoComments(comments);
            setCurrentPhotoIndex(0); // Reset to first photo
        } catch (error) {
            console.error('Error loading group photo:', error);
        } finally {
            setLoadingPhoto(false);
        }
    };

    const goToPreviousPhoto = () => {
        if (groupPhotos.length > 0) {
            setCurrentPhotoIndex((prevIndex) => 
                prevIndex === 0 ? groupPhotos.length - 1 : prevIndex - 1
            );
        }
    };

    const goToNextPhoto = () => {
        if (groupPhotos.length > 0) {
            setCurrentPhotoIndex((prevIndex) => 
                prevIndex === groupPhotos.length - 1 ? 0 : prevIndex + 1
            );
        }
    };
    
    const currentPhoto = groupPhotos[currentPhotoIndex];
    const currentComment = currentPhoto ? photoComments[currentPhoto.id] : null;
    
    // Debug logging
    console.log(`Group ${group.name}: Photos=${groupPhotos.length}, Index=${currentPhotoIndex}, CurrentPhoto=${currentPhoto ? 'Yes' : 'No'}`);
    if (currentPhoto) {
        console.log(`Current photo URI: ${currentPhoto.uri ? 'Has URI' : 'No URI'}`);
    }

    return (
        <View style={styles.groupContainer}>            <View style={styles.topSection}>                {/* Sunday Dump Dumpster Icon */}                <TouchableOpacity 
                    style={styles.sundayDumpIcon} 
                    onPress={() => {
                        router.push({
                            pathname: '/sunday-dump',
                            params: {
                                groupId: group.$id,
                                groupName: group.name
                            }
                        })
                    }}
                >
                    <Text style={styles.sunIcon}>🗑️</Text>
                </TouchableOpacity>
                
                {loadingPhoto ? (
                    <ActivityIndicator size="small" color="white" />
                ) : currentPhoto ? (
                    <>                        <View style={styles.photoNavigationContainer}>{groupPhotos.length > 1 && (
                                <TouchableOpacity 
                                    style={[styles.photoNavButton, { left: 10 }]} 
                                    onPress={goToPreviousPhoto}
                                >
                                    <Text style={styles.photoNavArrow}>◀</Text>
                                </TouchableOpacity>
                            )}
                            
                            {currentPhoto.uri ? (
                                <Image 
                                    source={{ uri: currentPhoto.uri }} 
                                    style={styles.groupDisplayPhoto}
                                    onError={(error) => console.error('Image load error:', error)}
                                    onLoad={() => console.log('Image loaded successfully')}
                                />
                            ) : (
                                <View style={[styles.groupDisplayPhoto, { backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ color: 'white', fontSize: 16 }}>No Image</Text>
                                </View>
                            )}
                            
                            {groupPhotos.length > 1 && (
                                <TouchableOpacity 
                                    style={[styles.photoNavButton, { right: 10 }]} 
                                    onPress={goToNextPhoto}
                                >
                                    <Text style={styles.photoNavArrow}>▶</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        {currentComment && (
                            <Text style={styles.photoCommentText}>"{currentComment}"</Text>
                        )}
                        
                        {groupPhotos.length > 1 && (
                            <Text style={styles.photoCountText}>
                                {currentPhotoIndex + 1} of {groupPhotos.length}
                            </Text>
                        )}
                    </>
                ) : null}
            </View>
            <View style={styles.groupNameContainer}>
                {showLeftArrow ? (
                    <TouchableOpacity onPress={onPressLeft}>
                        <Text style={styles.arrow}>◀</Text>
                    </TouchableOpacity>
                ) : <View style={styles.arrowPlaceholder} />}
                <Text style={styles.groupName}>{group.name}</Text>
                {showRightArrow ? (
                    <TouchableOpacity onPress={onPressRight}>
                        <Text style={styles.arrow}>▶</Text>
                    </TouchableOpacity>
                ) : <View style={styles.arrowPlaceholder} />}
            </View>
            
            <ScrollView style={styles.membersList}>
                {group.members.map((member, index) => (
                    <View key={index} style={styles.member}>
                        <View style={styles.memberAvatar} />
                        <View>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <Text style={styles.memberUsername}>@{member.userId.substring(0,10)}</Text>
                        </View>
                    </View>
                ))}
                <TouchableOpacity style={styles.leaveButton} onPress={() => onLeave(group)}>
                    <Text style={styles.leaveButtonText}>Leave group</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const CreateDiscover = ({ onCreate, onJoin, discoverableGroups, showLeftArrow, onPressLeft }: { onCreate: (name: string) => void, onJoin: (group: Group) => void, discoverableGroups: Group[], showLeftArrow: boolean, onPressLeft: () => void }) => {
    const [newGroupName, setNewGroupName] = useState('');
  
    const handleCreate = () => {
      if (!newGroupName.trim()) {
        Alert.alert('Error', 'Please enter a group name.');
        return;
      }
      onCreate(newGroupName.trim());
      setNewGroupName('');
    };
  
    return (
      <View style={[styles.groupContainer, styles.createDiscoverContainer]}>
        <ScrollView>
            <View style={styles.groupNameContainer}>
                {showLeftArrow ? (
                    <TouchableOpacity onPress={onPressLeft}>
                        <Text style={styles.arrow}>◀</Text>
                    </TouchableOpacity>
                ) : <View style={styles.arrowPlaceholder} />}
                <Text style={styles.discoverTitle}>Create or Discover</Text>
                <View style={styles.arrowPlaceholder} />
            </View>
    
            <View style={styles.createSection}>
                <TextInput
                    style={styles.createInput}
                    placeholder="Enter new group name..."
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                    <Text style={styles.createButtonText}>+ Create</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.discoverSection}>
                <Text style={styles.discoverSubtitle}>Discover Groups</Text>
                {discoverableGroups.length === 0 ? (
                    <Text style={styles.noGroupsText}>No new groups to discover.</Text>
                ) : (
                    discoverableGroups.map(group => (
                        <View key={group.$id} style={styles.discoverGroupCard}>
                            <View>
                                <Text style={styles.discoverGroupName}>{group.name}</Text>
                                <Text style={styles.discoverGroupMembers}>{group.memberCount} members</Text>
                            </View>
                            <TouchableOpacity style={styles.joinButton} onPress={() => onJoin(group)}>
                                <Text style={styles.joinButtonText}>Join</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
      </View>
    );
};

const Groups = () => {
    const { user } = useAuth();
    const { 
        userGroups, 
        allGroups, 
        isLoading, 
        createGroup, 
        joinGroup, 
        leaveGroup,
        fetchAllGroups,
    } = useGroups();
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        fetchAllGroups();
    }, []);
    
    const handleScrollTo = (pageIndex: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ x: pageIndex * width, animated: true });
        }
    };

    const discoverableGroups = allGroups.filter(group => !group.isUserMember);

    const handleCreateGroup = async (name: string) => {
        try {
            await createGroup(name);
            Alert.alert('Success', 'Group created!');
        } catch (error) {
            Alert.alert('Error', 'Failed to create group.');
        }
    };

    const handleJoinGroup = async (group: Group) => {
        try {
            await joinGroup(group.$id);
            Alert.alert('Success', `Joined ${group.name}!`);
        } catch (error) {
            Alert.alert('Error', 'Failed to join group.');
        }
    };

    const handleLeaveGroup = async (group: Group) => {
        Alert.alert(
            'Leave Group',
            `Are you sure you want to leave "${group.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leaveGroup(group.$id);
                            Alert.alert('Success', `You have left ${group.name}.`);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to leave group.');
                        }
                    },
                },
            ]
        );
    };

  return (
    <View style={{flex: 1, backgroundColor: Colors.cream}}>
        {isLoading && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color={Colors.orange} />}
        
        {/* Navigation Buttons */}
        <NavigationButtons position="bottom" />
        
        <ScrollView 
            ref={scrollRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            scrollEnabled={!isLoading}
        >
            {userGroups.map((group, index) => <GroupDisplay 
                key={group.$id} 
                group={group} 
                onLeave={handleLeaveGroup}
                showLeftArrow={index > 0}
                showRightArrow={true}
                onPressLeft={() => handleScrollTo(index - 1)}
                onPressRight={() => handleScrollTo(index + 1)}
            />)}
            <CreateDiscover 
                onCreate={handleCreateGroup}
                onJoin={handleJoinGroup}
                discoverableGroups={discoverableGroups}
                showLeftArrow={userGroups.length > 0}
                onPressLeft={() => handleScrollTo(userGroups.length - 1)}
            />
        </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    groupContainer: {
        width: width,
        flex: 1,
        backgroundColor: Colors.cream,
    },
    topSection: {
        backgroundColor: Colors.orange,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
        padding: 20,
    },    groupImage: {
        width: '100%',
        height: 200,
        borderRadius: 20,
        marginBottom: 10,
    },    groupDisplayPhoto: {
        width: '70%',
        height: '70%',
        borderRadius: 20,
        resizeMode: 'cover',
        backgroundColor: 'rgba(255,255,255,0.1)', // Add background to see if container is there
    },photoCommentText: {
        color: 'white',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 10,
        maxWidth: '80%',
    },    photoNavigationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
        flex: 1,
    },photoNavButton: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        top: '50%',
        marginTop: -20,
    },
    photoNavArrow: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    photoCountText: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
        opacity: 0.8,
    },
    caption: {
        color: 'white',
        fontSize: 16,
    },
    groupNameContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    arrow: {
        fontSize: 24,
        color: Colors.orange,
        padding: 10,
    },
    arrowPlaceholder: {
        width: 44, // Roughly the size of the arrow touchable
    },
    groupName: {
        fontSize: 20,
        fontWeight: 'bold',
        backgroundColor: Colors.orange,
        color: 'white',
        paddingVertical: 5,
        paddingHorizontal: 20,
        borderRadius: 20,
    },    membersList: {
        paddingHorizontal: 20,
    },    sundayDumpIcon: {
        position: 'absolute',
        top: 30,
        right: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 10,
    },
    sunIcon: {
        fontSize: 28,
    },
    member: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 25,
        marginBottom: 10,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.yellow,
        marginRight: 15,
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark_text,
    },
    memberUsername: {
        fontSize: 14,
        color: Colors.dark_text,
    },
    leaveButton: {
        backgroundColor: Colors.red,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        margin: 20,
    },
    leaveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    createDiscoverContainer: {
        padding: 20,
    },
    discoverTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.dark_text,
        marginHorizontal: 10,
    },
    createSection: {
        marginBottom: 30,
    },
    createInput: {
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    createButton: {
        backgroundColor: Colors.orange,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    discoverSection: {
        
    },
    discoverSubtitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.dark_text,
        marginBottom: 15,
    },
    discoverGroupCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: Colors.yellow,
    },
    discoverGroupName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    discoverGroupMembers: {
        fontSize: 12,
        color: '#666',
    },
    joinButton: {
        backgroundColor: Colors.yellow,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    joinButtonText: {
        color: Colors.dark_text,
        fontWeight: 'bold',
    },
    noGroupsText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    }
})

export default Groups; 