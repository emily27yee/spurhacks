import { View, Text, StyleSheet, ScrollView, Image } from 'react-native'
import React from 'react'
import { Colors } from '@/constants/Colors'

const Profile = () => {
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
})

export default Profile; 