import { React, useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import { Breadcrumb } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { CustomToaster, Notify } from "../../shared/CustomToaster.tsx";
import { useNavigate, useParams } from "react-router-dom";
import TicketService from "../../api/TicketServices";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import "./id.css";
import CommentInput from "../../component/comment/CommentInput";
import CommentItem from "../../component/comment/CommentItem";
import { useAuthStore } from "../../store.tsx";
import io from "socket.io-client";
import UserService from "../../api/UserService.js";

const socket = io("http://localhost:3001");


export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState({
    _id: "",
    title: "",
    status: "",
    author: "",
    description: "",
    comments: []
  });

  const { user } = useAuthStore();

  const [commentInput, setCommentInput] = useState("");
  const [assignees, setAssignees] = useState([]);

  const [selectedAssignees, setSelectedAssignees] = useState([]);

  const addComment = async () => {
    try {
      const res = await TicketService.comment(id, commentInput);
      if (res.data?.success === true) {
        fetchTicket();
        socket.emit("comment-created",
          {
            type: 'comment', message: `${user?.username} commented on your ticket.`,
            user: user?.id || "",
            ticketId: id,
            author: ticket.author,
            link: `/tickets/edit/${id}`
          });
      }
    } catch (error) {

    }
    setCommentInput('')
  }

  const fetchTicket = async () => {
    try {
      const result = await TicketService.get(id);
      if (result.success === true && result.ticket) {
        setTicket(result.ticket);
        setSelectedAssignees(result.ticket.assignees.map((assignee) => assignee._id));
      }
    } catch (error) {
      if (error.response && (error.response.status === 404 || error.response.status === 400)) {
        navigate("/404")
      }
    }
  };

  const updateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await TicketService.update(ticket, selectedAssignees);
      if (res.success === true) {
        await Notify(res.message, "success");
        fetchTicket();
      }
    } catch (error) { }
  };

  const handleChange = (e) => {
    return setTicket({ ...ticket, [e.target.name]: e.target.value });
  };

  const addAssignees = async (e) => {
    if (selectedAssignees.includes(e.target.value)) {
      return
    }
    setSelectedAssignees([...selectedAssignees, e.target.value])

  }

  const fetchAssignees = () => {
    UserService.assignees().then((res) => {
      if (res.data?.success === true) {
        setAssignees(res.data.assignees.map((assignee) => {
          return { _id: assignee._id, fullName: assignee.firstName + " " + assignee.lastName }
        }));
      }
    }).catch((error) => {
      console.log(error)
    })
  }


  useEffect(() => {
    fetchTicket();
    fetchAssignees();
  }, []);
  return (
    <AppLayout>
      <Breadcrumb className="d-flex justify-center">
        <LinkContainer to="/dashboard">
          <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
        </LinkContainer>
        <LinkContainer to="/tickets">
          <Breadcrumb.Item>Tickets</Breadcrumb.Item>
        </LinkContainer>
        <Breadcrumb.Item active>{ticket.title}</Breadcrumb.Item>
      </Breadcrumb>
      <div className="edit-form border rounded">
        <Form onSubmit={updateTicket}>
          <Form.Group className="mb-3 form-group">
            <Form.Label>Title</Form.Label>
            <Form.Control
              required
              type="text"
              name="title"
              value={ticket.title}
              onChange={handleChange}
              disabled={ticket.author !== user.id} />
          </Form.Group>
          <Form.Group className="mb-3 form-group">
            <Form.Label>Assignee Picker</Form.Label>
            <Form.Select className="picker" type="select" name="assignees" onChange={addAssignees} >
              <option value="">Select</option>
              {assignees?.map((assignee) =>
                <option value={assignee._id} >
                  {assignee.fullName}
                </option>
              )}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3 form-group">
            <Form.Label>Selected Assignees</Form.Label>
            <div className="border rounded bg-white">
              {selectedAssignees.length ? selectedAssignees.map((assignee) =>
                <div className="badge bg-primary me-1">
                  {assignees.find((item) => item._id === assignee).fullName}
                  <span
                    className="btn-cancel"
                    onClick={() => setSelectedAssignees(selectedAssignees.filter((item) => item !== assignee))}
                  >
                    &times;
                  </span>
                </div>
              ) : <span>None</span>}
            </div>
          </Form.Group>
          <Form.Group className="mb-3 form-group">
            <Form.Label>Status</Form.Label>
            <Form.Select required type="select" name="status" onChange={handleChange} disabled={ticket.author !== user.id} >
              <option>Select One</option>
              <option value="unassigned" selected={ticket.status === "unassigned"}>
                Unassigned
              </option>
              <option value="awaiting-feedback" selected={ticket.status === "awaiting-feedback"}>
                Awaiting Feedback
              </option>
              <option value="complete" selected={ticket.status === "complete"}>
                Complete
              </option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3 form-group">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              placeholder="Leave a comment here"
              name="description"
              value={ticket.description}
              style={{ height: "100px" }}
              onChange={handleChange}
              disabled={ticket.author !== user.id}
            />
          </Form.Group>
          {
            (ticket.author === user.id) ? <Button className="form-control mt-3 button" type="submit">
              Update </Button> : <Button className="form-control mt-3 button" type="submit" disabled>Update</Button>
          }
        </Form>
      </div>
      <div className="comment-section d-flex flex-column gap-2 border-start rounded">
        <h5>Comments</h5>
        {ticket.comments?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .filter((comment) => !comment.parentId).map((comment) =>
            <div className="rounded comment-item">
              <CommentItem key={comment._id} comment={comment} fetchTicket={fetchTicket} />
            </div>
          )}
      </div>
      <div className="comment-box">
        <CommentInput commentInput={commentInput} change={(e) => setCommentInput(e.target.value)} addComment={addComment} />
      </div>

      <CustomToaster />

    </AppLayout>
  );
}
