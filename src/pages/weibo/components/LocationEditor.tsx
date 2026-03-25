import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    TouchableWithoutFeedback,
    StyleSheet,
} from 'react-native';

type Props = {
    location: any;
    setLocation: (loc:any)=>void;
};

export const LocationEditor = ({ location, setLocation }: Props) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<TextInput|null>(null);

    if (!location) return null;

    return (
        <TouchableWithoutFeedback
            onPress={() => {
                setEditing(true);
                inputRef.current?.focus();
            }}
        >
            <View style={styles.row}>
                {editing ? (
                    <TextInput
                        ref={inputRef}
                        value={location.address}
                        onChangeText={(text) =>
                            setLocation({ ...location, address: text })
                        }
                        style={styles.input}
                        onBlur={() => setEditing(false)}
                        autoFocus
                    />
                ) : (
                    <>
                        <Text style={styles.text}>📍{location.address}</Text>
                        <Pressable
                            onPress={() => setLocation(null)}
                            style={styles.deleteBtn}
                        >
                            <Text style={styles.deleteText}>×</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        flex: 1,
        color: '#555',
    },
    deleteBtn: {
        marginLeft: 4,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingHorizontal: 4,
    },
    deleteText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 6,
    },
});
