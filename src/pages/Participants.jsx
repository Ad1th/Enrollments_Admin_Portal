import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "../api/services";
import { Button, Input, Card } from "../components/ResultComponents";
import {
  FaSearch,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import UserDetailModal from "../components/UserDetailModal";

const Participants = () => {
  // =========================
  // DATA STATES
  // =========================
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  // =========================
  // FILTER / SEARCH STATES
  // =========================
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterDate, setFilterDate] = useState("");
  const [showSubmittedOnly, setShowSubmittedOnly] = useState(false);

  // =========================
  // PAGINATION STATES
  // =========================
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // =========================
  // FETCH ALL PARTICIPANTS
  // =========================
  const fetchUsers = useCallback(async () => {
    setDataLoading(true);

    try {
      const adminId = localStorage.getItem("adminId");

      const response = await adminService.getAllUsers(adminId);

      const userList = response.data || [];

      setUsers(userList);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // =========================
  // FILTER + SORT
  // =========================
  const processedUsers = users
    .filter((user) => {
      // Search by name, registration number or email
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        user.username?.toLowerCase().includes(search) ||
        user.regno?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search);

      // Meeting date filter
      let matchesDate = true;

      if (filterDate && user.meetingTime) {
        const meetingDate = new Date(user.meetingTime)
          .toISOString()
          .split("T")[0];

        matchesDate = meetingDate === filterDate;
      } else if (filterDate && !user.meetingTime) {
        matchesDate = false;
      }

      // Submitted-only filter
      let matchesSubmitted = true;

      if (showSubmittedOnly) {
        const hasSubmitted = [
          ...(user.techTasks || []),
          ...(user.designTasks || []),
          ...(user.managementTasks || []),
        ].some((task) => task && task.isDone === true);

        matchesSubmitted = hasSubmitted;
      }

      return matchesSearch && matchesDate && matchesSubmitted;
    })
    .sort((a, b) => {
      // Users without meeting time go to the bottom
      if (!a.meetingTime) return 1;
      if (!b.meetingTime) return -1;

      const dateA = new Date(a.meetingTime);
      const dateB = new Date(b.meetingTime);

      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  // =========================
  // PAGINATION
  // =========================
  const totalPages = Math.ceil(processedUsers.length / pageSize);

  const paginatedUsers = processedUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Reset page whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, sortOrder, showSubmittedOnly]);

  // =========================
  // CSV EXPORT
  // =========================
  const handleExportCSV = () => {
    if (processedUsers.length === 0) return;

    const headers = [
      "Name",
      "RegNo",
      "Mobile",
      "Email",
      "Tech Status",
      "Design Status",
      "Management Status",
      "Meeting Time",
    ];

    const rows = processedUsers.map((user) => [
      user.username || "",
      user.regno || "",
      user.mobile || "",
      user.email || "",
      user.tech ?? "",
      user.design ?? "",
      user.management ?? "",
      user.meetingTime
        ? new Date(user.meetingTime).toLocaleString()
        : "Not Scheduled",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);

    link.setAttribute(
      "download",
      `mfc_participants_export_${new Date().toISOString()}.csv`,
    );

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  // =========================
  // PAGE NUMBERS
  // =========================
  const getPageNumbers = () => {
    const pages = [];

    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return pages;
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div className="container" style={{ maxWidth: "1600px" }}>
      {/* PAGE HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "var(--text-main)",
              marginBottom: "8px",
              letterSpacing: "-0.5px",
            }}
          >
            Participants
          </h1>

          <p style={{ color: "var(--text-muted)" }}>
            View and manage all recruitment participants
          </p>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-card)",
            padding: "12px 24px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: "600",
              marginBottom: "4px",
            }}
          >
            TOTAL PARTICIPANTS
          </span>

          <span
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "var(--primary)",
            }}
          >
            {users.length}
          </span>
        </div>
      </div>

      {/* FILTER / CONTROL AREA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          {/* SEARCH */}
          <Card
            className="search-container"
            style={{
              flex: 1,
              minWidth: "300px",
              padding: "12px 16px",
            }}
          >
            <div style={{ position: "relative" }}>
              <FaSearch
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-light)",
                }}
              />

              <Input
                placeholder="Search by name, reg no, or email..."
                style={{
                  paddingLeft: "48px",
                  border: "none",
                  background: "transparent",
                  width: "100%",
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card>

          {/* DATE FILTER */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              backgroundColor: "var(--bg-card)",
              padding: "0 16px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              Filter Date:
            </span>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                padding: "12px",
                outline: "none",
                colorScheme: "dark",
              }}
            />

            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* SORT */}
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "0 24px",
              color: "var(--primary)",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "48px",
            }}
          >
            Start Time {sortOrder === "asc" ? "↑" : "↓"}
          </button>

          {/* EXPORT */}
          <button
            onClick={handleExportCSV}
            style={{
              backgroundColor: "var(--primary)",
              border: "none",
              borderRadius: "12px",
              padding: "0 24px",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "48px",
            }}
          >
            <FaDownload />
            Export CSV
          </button>

          {/* SUBMITTED FILTER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 8px",
            }}
          >
            <input
              type="checkbox"
              id="showSubmittedOnly"
              checked={showSubmittedOnly}
              onChange={(e) => setShowSubmittedOnly(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
              }}
            />

            <label
              htmlFor="showSubmittedOnly"
              style={{
                color: "var(--text-main)",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Show Submitted Only
            </label>
          </div>
        </div>

        {/* RESULT COUNT */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          <span>
            Showing {processedUsers.length} of {users.length} participants
          </span>

          {searchTerm || filterDate || showSubmittedOnly ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterDate("");
                setShowSubmittedOnly(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* TABLE / LOADING */}
      {dataLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "var(--text-muted)",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              marginBottom: "16px",
            }}
          >
            Loading participants...
          </div>

          <div
            className="spinner"
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              margin: "0 auto",
              animation: "spin 1s linear infinite",
            }}
          ></div>
        </div>
      ) : (
        <Card
          style={{
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Name
                  </th>

                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Reg No
                  </th>

                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Mobile
                  </th>

                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Domains
                  </th>

                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Meeting Time
                  </th>

                  <th
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user._id}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      {/* NAME */}
                      <td
                        style={{
                          padding: "16px",
                          color: "var(--text-main)",
                          fontWeight: "600",
                        }}
                      >
                        {user.username}
                      </td>

                      {/* REGISTRATION NUMBER */}
                      <td
                        style={{
                          padding: "16px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {user.regno}
                      </td>

                      {/* MOBILE */}
                      <td
                        style={{
                          padding: "16px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {user.mobile}
                      </td>

                      {/* DOMAINS */}
                      <td
                        style={{
                          padding: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {user.domain && user.domain.length > 0 ? (
                            user.domain.map((domain, index) => (
                              <span
                                key={`${domain}-${index}`}
                                style={{
                                  backgroundColor: "rgba(252, 122, 0, 0.12)",
                                  color: "var(--primary)",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }}
                              >
                                {domain}
                              </span>
                            ))
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "13px",
                              }}
                            >
                              Not specified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* MEETING TIME */}
                      <td
                        style={{
                          padding: "16px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {user.meetingTime
                          ? new Date(
                              user.meetingTime,
                            ).toLocaleString()
                          : "Not Scheduled"}
                      </td>

                      {/* ACTION */}
                      <td
                        style={{
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        color: "var(--text-muted)",
                      }}
                    >
                      No participants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {processedUsers.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderTop: "1px solid var(--border-color)",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              {/* PAGE SIZE */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                }}
              >
                <span>Rows per page:</span>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    outline: "none",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* PAGE NAVIGATION */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-card)",
                    color:
                      currentPage === 1
                        ? "var(--text-muted)"
                        : "var(--text-main)",
                    cursor:
                      currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  <FaChevronLeft />
                </button>

                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      minWidth: "36px",
                      height: "36px",
                      padding: "0 8px",
                      borderRadius: "6px",
                      border:
                        currentPage === page
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border-color)",
                      backgroundColor:
                        currentPage === page
                          ? "var(--primary)"
                          : "var(--bg-card)",
                      color:
                        currentPage === page
                          ? "white"
                          : "var(--text-main)",
                      cursor: "pointer",
                      fontWeight:
                        currentPage === page ? "600" : "400",
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, totalPages),
                    )
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-card)",
                    color:
                      currentPage === totalPages
                        ? "var(--text-muted)"
                        : "var(--text-main)",
                    cursor:
                      currentPage === totalPages
                        ? "not-allowed"
                        : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  <FaChevronRight />
                </button>
              </div>

              {/* PAGE INFORMATION */}
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "14px",
                }}
              >
                Page {currentPage} of {totalPages || 1}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          users={processedUsers}
          onNavigate={setSelectedUser}
          onUserUpdate={(updatedUser) => {
            if (updatedUser && updatedUser._id) {
              setUsers((prevUsers) =>
                prevUsers.map((user) =>
                  user._id === updatedUser._id
                    ? { ...user, ...updatedUser }
                    : user,
                ),
              );
            }

            setSelectedUser((prev) =>
              prev ? { ...prev, ...updatedUser } : prev,
            );
          }}
        />
      )}
    </div>
  );
};

export default Participants;