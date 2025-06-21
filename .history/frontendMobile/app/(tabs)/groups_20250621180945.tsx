import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'

const { width } = Dimensions.get('window');

const Group = ({ group }) => (
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
                        <Text style={styles.memberUsername}>{member.username}</Text>
                    </View>
                </View>
            ))}
        </ScrollView>
        <TouchableOpacity style={styles.leaveButton}>
            <Text style={styles.leaveButtonText}>Leave group</Text>
        </TouchableOpacity>
    </View>
);


const Groups = () => {
  const groups = [
    { 
      id: 1, 
      name: '[group name]',
      members: [
        { name: 'Name name', username: '@username' },
        { name: 'Name name', username: '@username' },
        { name: 'Name name', username: '@username' },
      ] 
    },
    { 
      id: 2, 
      name: '[another group]',
      members: [
        { name: 'Person A', username: '@persona' },
        { name: 'Person B', username: '@personb' },
      ] 
    },
  ];

  return (
    <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        style={styles.container}
    >
        {groups.map(group => <Group key={group.id} group={group} />)}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    groupContainer: {
        width: width,
        flex: 1,
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
        color: Colors.dark_text,
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
    }
})

export default Groups; 