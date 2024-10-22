import React from "react";
import dayjs from "dayjs";
import { Modal, Box, Button, Typography, List, ListItem, ListItemText } from "@mui/material"; // MUIコンポーネントをインポート
import "./styles.css";

const ListModal = ({ reservations, onClose, onCancel }) => {
  return (
    <Modal open={true} onClose={onClose}>
      <Box
        sx={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: 24,
          maxWidth: "500px",
          width: "100%",
          margin: "auto",
          marginTop: "10%",
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          予約リスト
        </Typography>
        {reservations.length === 0 ? (
          <Typography>該当する予約はありません。</Typography>
        ) : (
          <List>
            {reservations.map((reservation, index) => (
              <ListItem key={index} sx={{ display: "flex", justifyContent: "space-between" }}>
                <ListItemText
                  primary={reservation.summary}
                  secondary={`${dayjs(reservation.start.dateTime).format("YYYY/MM/DD HH:mm:ss")} 〜 ${dayjs(reservation.end.dateTime).format("YYYY/MM/DD HH:mm:ss")}`}
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => onCancel(reservation.id)}
                >
                  キャンセル
                </Button>
              </ListItem>
            ))}
          </List>
        )}
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button variant="contained" onClick={onClose}>
            閉じる
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ListModal;
