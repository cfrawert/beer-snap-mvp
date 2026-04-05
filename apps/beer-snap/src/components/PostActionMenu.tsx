import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text, useTheme } from "@beer-snap/ui";

type ActionItem = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  tone?: "default" | "danger";
  onPress: () => void;
};

export const PostActionMenu = ({
  canDelete,
  canReport,
  onShare,
  onDelete,
  onReport
}: {
  canDelete: boolean;
  canReport: boolean;
  onShare: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const actions = useMemo<ActionItem[]>(() => {
    const nextActions: ActionItem[] = [
      {
        key: "share",
        label: "Share link",
        icon: "share",
        onPress: onShare
      }
    ];

    if (canReport && onReport) {
      nextActions.push({
        key: "report",
        label: "Report image",
        icon: "flag",
        onPress: onReport
      });
    }

    if (canDelete && onDelete) {
      nextActions.push({
        key: "delete",
        label: "Delete upload",
        icon: "trash-2",
        tone: "danger",
        onPress: onDelete
      });
    }

    return nextActions;
  }, [canDelete, canReport, onDelete, onReport, onShare]);

  const runAction = (action: ActionItem) => {
    setOpen(false);
    action.onPress();
  };

  return (
    <>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open post actions"
          onPress={() => setOpen((current) => !current)}
          style={[
            styles.trigger,
            {
              backgroundColor: colors.overlay,
              borderColor: colors.overlayBorder
            }
          ]}
        >
          <Feather name="more-horizontal" size={18} color={colors.text} />
        </Pressable>
        {open ? (
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border
              }
            ]}
          >
            {actions.map((action, index) => (
              <Pressable
                key={action.key}
                onPress={() => runAction(action)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                    opacity: pressed ? 0.72 : 1
                  }
                ]}
              >
                <Feather
                  name={action.icon}
                  size={16}
                  color={action.tone === "danger" ? colors.danger : colors.text}
                />
                <Text
                  style={{
                    color: action.tone === "danger" ? colors.danger : colors.text,
                    fontWeight: "600"
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "relative"
  },
  trigger: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  menu: {
    position: "absolute",
    top: 46,
    right: 0,
    width: 196,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 4
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13
  }
});
