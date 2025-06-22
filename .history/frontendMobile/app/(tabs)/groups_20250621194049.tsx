import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors } from '@/constants/Colors'
import { useGroups, type Group } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

const GroupDisplay = ({ group, onLeave }: { group: Group, onLeave: (group: Group) => void }) => (
    <View style={styles.groupContainer}>
        <View style={styles.topSection}>
            <Image source={require('@/assets/images/react-logo.png')} style={styles.groupImage} />
            <Text style={styles.caption}>[caption if applicable]</Text>
        </View>
        <View style={styles.groupNameContainer}>
            <Text style={styles.arrow}>◀</Text>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.arrow}>▶</Text>
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
        </ScrollView>
        <TouchableOpacity style={styles.leaveButton} onPress={() => onLeave(group)}>
            <Text style={styles.leaveButtonText}>Leave group</Text>
        </TouchableOpacity>
    </View>
);

const CreateDiscover = ({ onCreate, onJoin, discoverableGroups }: { onCreate: (name: string) => void, onJoin: (group: Group) => void, discoverableGroups: Group[] }) => {
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
            <Text style={styles.discoverTitle}>Create or Discover</Text>
    
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

    useEffect(() => {
        fetchAllGroups();
    }, []);
    
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
        <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            scrollEnabled={!isLoading}
        >
            <CreateDiscover 
                onCreate={handleCreateGroup}
                onJoin={handleJoinGroup}
                discoverableGroups={discoverableGroups}
            />
            {userGroups.map(group => <GroupDisplay key={group.$id} group={group} onLeave={handleLeaveGroup} />)}
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
    },
    groupImage: {
        width: '100%',
        height: 200,
        borderRadius: 20,
        marginBottom: 10,
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
    },
    groupName: {
        fontSize: 20,
        fontWeight: 'bold',
        backgroundColor: Colors.orange,
        color: 'white',
        paddingVertical: 5,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    membersList: {
        paddingHorizontal: 20,
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
        textAlign: 'center',
        marginBottom: 20,
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