import { useState, useEffect } from "react";
import axios from "axios";
import {
  Sun,
  Moon,
  Plus,
  Trash2,
  CheckCircle,
  LogIn,
  UserPlus,
  LogOut,
  Loader2,
  AlertCircle,
  Move,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";

// Configura axios
const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// eai

// Endpoints conforme especificação
const ROUTES = {
  register: "/users/register",
  login: "/users/login",
  me: "/users/me",
  getTodos: "/todos/getTasks",
  createTodo: "/todos/sendTask",
  updateTodo: "/todos/",
};

// Componente de Feedback
const FeedbackMessage = ({ type, message }) => {
  const styles = {
    success: "bg-green-100 border-green-400 text-green-700",
    error: "bg-red-100 border-red-400 text-red-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
  };

  return (
    <div
      className={`${styles[type]} border px-4 py-3 rounded-lg mb-4 flex items-center gap-2 font-medium`}
    >
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
};

// Componente de Loading
const LoadingSpinner = () => (
  <div className="flex justify-center py-8">
    <Loader2 className="animate-spin text-[#0056b3]" size={32} />
  </div>
);

export default function App() {
  // Estado da aplicação
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });
  const [draggedTodo, setDraggedTodo] = useState(null);
  const [expandedColumns, setExpandedColumns] = useState({
    "a fazer": true,
    fazendo: true,
    pronto: true,
  });
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "" });

  // Aplica tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Inicialização
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      loadUserData();
      // Carrega usuários fictícios para demonstração
      setUsers([
        {
          id: 1,
          name: "Você",
          email: user?.email || "",
          avatar: `https://i.pravatar.cc/150?u=${user?.email || "default"}`,
          assignedTasks: [],
        },
        {
          id: 2,
          name: "João Silva",
          email: "joao@exemplo.com",
          avatar: "https://i.pravatar.cc/150?u=joao@exemplo.com",
          assignedTasks: [],
        },
        {
          id: 3,
          name: "Maria Souza",
          email: "maria@exemplo.com",
          avatar: "https://i.pravatar.cc/150?u=maria@exemplo.com",
          assignedTasks: [],
        },
      ]);
    }
  }, [token, user?.email]);

  // Carrega dados do usuário e tarefas
  async function loadUserData() {
    try {
      setLoading(true);
      await Promise.all([loadProfile(), loadTodos()]);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  // Carrega perfil
  async function loadProfile() {
    try {
      const { data } = await api.get(ROUTES.me);
      setUser(data);
    } catch (error) {
      handleError(error);
      handleLogout();
    }
  }

  // Carrega tarefas
  async function loadTodos() {
    try {
      const { data } = await api.get(ROUTES.getTodos);
      setTodos(
        Array.isArray(data)
          ? data.map((todo) => ({
              ...todo,
              assignedTo: todo.assignedTo || [],
            }))
          : []
      );
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        handleError(error);
      }
      setTodos([]);
    }
  }

  // Logout
  function handleLogout() {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setTodos([]);
    showFeedback("info", "Você saiu da sua conta");
  }

  // Tratamento de erros
  function handleError(error) {
    const message = error.response?.data?.error || "Ocorreu um erro";
    showFeedback("error", message);
    console.error(error);
  }

  // Feedback visual
  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: null, message: null }), 5000);
  }

  // Toggle column expansion
  const toggleColumn = (columnId) => {
    setExpandedColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  // Adicionar novo usuário
  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      const user = {
        id: Date.now(),
        ...newUser,
        avatar: `https://i.pravatar.cc/150?u=${newUser.email}`,
        assignedTasks: [],
      };
      setUsers([...users, user]);
      setNewUser({ name: "", email: "" });
      setShowUserModal(false);
      showFeedback("success", "Usuário adicionado com sucesso!");
    }
  };

  // Drag and Drop para tarefas
  const handleDragStart = (e, todo) => {
    e.dataTransfer.setData("text/plain", todo.id);
    setDraggedTodo(todo);
    e.currentTarget.classList.add("dragging");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove("dragging");
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const todoId = e.dataTransfer.getData("text/plain");

    if (draggedTodo && draggedTodo.status !== newStatus) {
      try {
        // Atualização otimista
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo.id === draggedTodo.id ? { ...todo, status: newStatus } : todo
          )
        );

        await api.put(
          `${ROUTES.updateTodo}${todoId}`,
          { status: newStatus },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Recarrega para sincronização
        await loadTodos();
      } catch (error) {
        handleError(error);
        // Reverte se houver erro
        setTodos((prevTodos) =>
          prevTodos.map((todo) =>
            todo.id === draggedTodo.id
              ? { ...todo, status: draggedTodo.status }
              : todo
          )
        );
      }
    }
    setDraggedTodo(null);
  };

  // Drag and Drop para usuários
  const handleUserDragStart = (e, user) => {
    e.dataTransfer.setData("user/id", user.id);
    e.currentTarget.classList.add("dragging-user");
  };

  const handleUserDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleUserDragEnd = (e) => {
    e.currentTarget.classList.remove("dragging-user");
  };

  const handleUserDrop = (e, todo) => {
    e.preventDefault();
    const userId = e.dataTransfer.getData("user/id");
    const user = users.find((u) => u.id === Number(userId));

    if (user && !todo.assignedTo.includes(user.id)) {
      // Atualiza a tarefa com o novo usuário
      const updatedTodos = todos.map((t) =>
        t.id === todo.id ? { ...t, assignedTo: [...t.assignedTo, user.id] } : t
      );

      setTodos(updatedTodos);

      // Atualiza o usuário com a nova tarefa
      const updatedUsers = users.map((u) =>
        u.id === user.id
          ? { ...u, assignedTasks: [...u.assignedTasks, todo.id] }
          : u
      );

      setUsers(updatedUsers);
      showFeedback(
        "success",
        `${user.name} foi atribuído à tarefa "${todo.title}"`
      );

      // Aqui você faria a chamada à API para persistir a alteração
      // await api.put(`${ROUTES.updateTodo}${todo.id}`, {
      //   assignedTo: [...todo.assignedTo, user.id]
      // });
    }
  };

  // Formulário de autenticação
  const [authMode, setAuthMode] = useState("login");
  const authFormik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validationSchema: Yup.object().shape({
      name:
        authMode === "register"
          ? Yup.string().required("Nome é obrigatório")
          : Yup.string(),
      email: Yup.string()
        .email("Email inválido")
        .required("Email é obrigatório"),
      password: Yup.string()
        .min(authMode === "register" ? 6 : 1, "Mínimo 6 caracteres")
        .required("Senha é obrigatória"),
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const endpoint = authMode === "login" ? ROUTES.login : ROUTES.register;
        const { data } = await api.post(endpoint, values);

        localStorage.setItem("token", data.token);
        setToken(data.token);
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;

        showFeedback(
          "success",
          authMode === "login"
            ? "Login realizado com sucesso!"
            : "Conta criada com sucesso!"
        );

        resetForm();
      } catch (error) {
        handleError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Formulário de tarefas
  const todoFormik = useFormik({
    initialValues: {
      title: "",
      category: "",
      priority: "média",
      status: "a fazer",
      assignedTo: [],
    },
    validationSchema: Yup.object({
      title: Yup.string()
        .min(3, "Mínimo 3 caracteres")
        .required("Título é obrigatório"),
      category: Yup.string().required("Categoria é obrigatória"),
      priority: Yup.string().oneOf(["baixa", "média", "alta"]).required(),
      status: Yup.string().oneOf(["a fazer", "fazendo", "pronto"]).required(),
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const response = await api.post(
          ROUTES.createTodo,
          {
            title: values.title,
            priority: values.priority,
            category: values.category,
            status: values.status,
            assignedTo: values.assignedTo,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setTodos((prevTodos) => [...prevTodos, response.data]);
        resetForm();
        showFeedback("success", "Tarefa adicionada com sucesso!");
      } catch (error) {
        handleError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Ações CRUD
  const toggleComplete = async (id, completed) => {
    try {
      await api.put(`${ROUTES.updateTodo}${id}`, { completed: !completed });
      await loadTodos();
    } catch (error) {
      handleError(error);
    }
  };

  const removeTodo = async (id) => {
    try {
      await api.delete(`${ROUTES.updateTodo}${id}`);
      await loadTodos();
      showFeedback("success", "Tarefa removida com sucesso");
    } catch (error) {
      handleError(error);
    }
  };

  // Agrupar tarefas por status
  const groupedTodos = todos.reduce((acc, todo) => {
    if (!acc[todo.status]) {
      acc[todo.status] = [];
    }
    acc[todo.status].push(todo);
    return acc;
  }, {});

  const statusColumns = [
    {
      id: "a fazer",
      title: "A Fazer",
      color: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "fazendo",
      title: "Fazendo",
      color: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      id: "pronto",
      title: "Pronto",
      color: "bg-green-50",
      borderColor: "border-green-200",
    },
  ];

  // UI de autenticação
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-[#0056b3] p-3 rounded-full">
              <LogIn className="text-white" size={28} />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-center text-[#0056b3]">
            {authMode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </h2>

          {feedback.message && (
            <FeedbackMessage type={feedback.type} message={feedback.message} />
          )}

          <form onSubmit={authFormik.handleSubmit} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  name="name"
                  placeholder="Seu nome"
                  onChange={authFormik.handleChange}
                  value={authFormik.values.name}
                  className={`w-full p-3 rounded-lg border bg-white ${
                    authFormik.errors.name
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {authFormik.errors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {authFormik.errors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="seu@email.com"
                onChange={authFormik.handleChange}
                value={authFormik.values.email}
                className={`w-full p-3 rounded-lg border bg-white ${
                  authFormik.errors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
              {authFormik.errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {authFormik.errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                onChange={authFormik.handleChange}
                value={authFormik.values.password}
                className={`w-full p-3 rounded-lg border bg-white ${
                  authFormik.errors.password
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {authFormik.errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {authFormik.errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={authFormik.isSubmitting}
              className="w-full bg-[#0056b3] hover:bg-[#004494] text-white p-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-70 font-medium"
            >
              {authFormik.isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : authMode === "login" ? (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Registrar
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {authMode === "login"
              ? "Não tem uma conta?"
              : "Já possui uma conta?"}{" "}
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                authFormik.resetForm();
              }}
              className="text-[#0056b3] hover:underline font-medium"
            >
              {authMode === "login" ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // UI principal
  return (
    <div
      className="min-h-screen bg-[#f8fafc] text-gray-900"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Modal de Adicionar Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Adicionar Novo Usuário</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-200 rounded"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 bg-[#0056b3] text-white rounded"
                  onClick={handleAddUser}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0056b3]">
              Olá, {user?.name}
            </h1>
            <p className="text-sm text-gray-500">
              {todos.filter((t) => t.status !== "pronto").length} tarefas
              pendentes
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 hover:text-[#0056b3]"
              aria-label="Alternar tema"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-2 text-sm font-medium cursor-pointer text-[#0056b3] hover:text-[#004494]"
            >
              <UserPlus size={18} />
              Adicionar Usuário
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium cursor-pointer text-[#0056b3] hover:text-[#004494]"
              aria-label="Sair"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </header>

        {/* Feedback */}
        {feedback.message && (
          <div className="mb-6">
            <FeedbackMessage type={feedback.type} message={feedback.message} />
          </div>
        )}

        {/* Seção de Membros da Equipe */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold mb-3 text-[#0056b3] flex items-center gap-2">
            <Users size={18} />
            Membros da Equipe
          </h3>
          <div className="flex flex-wrap gap-2">
            {users.map((user) => (
              <div
                key={user.id}
                draggable
                onDragStart={(e) => handleUserDragStart(e, user)}
                onDragEnd={handleUserDragEnd}
                className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm cursor-grab hover:bg-gray-200 transition-colors"
              >
                <img
                  src={user.avatar}
                  className="w-6 h-6 rounded-full"
                  alt={user.name}
                />
                <span>{user.name.split(" ")[0]}</span>
              </div>
            ))}
            <button
              onClick={() => setShowUserModal(true)}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm hover:bg-gray-300 transition-colors"
              title="Adicionar usuário"
            >
              +
            </button>
          </div>
        </div>

        {/* Formulário de tarefa */}
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold cursor-pointer mb-4 text-[#0056b3]">
            Adicionar nova tarefa
          </h2>

          <form onSubmit={todoFormik.handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título da tarefa
              </label>
              <input
                name="title"
                placeholder="O que precisa ser feito?"
                value={todoFormik.values.title}
                onChange={todoFormik.handleChange}
                className={`w-full p-3 rounded-lg border bg-white ${
                  todoFormik.errors.title ? "border-red-500" : "border-gray-300"
                }`}
              />
              {todoFormik.errors.title && (
                <p className="mt-1 text-sm text-red-500">
                  {todoFormik.errors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  name="category"
                  placeholder="Ex: Trabalho, Pessoal"
                  value={todoFormik.values.category}
                  onChange={todoFormik.handleChange}
                  className={`w-full p-3 rounded-lg border bg-white ${
                    todoFormik.errors.category
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {todoFormik.errors.category && (
                  <p className="mt-1 text-sm text-red-500">
                    {todoFormik.errors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  name="priority"
                  value={todoFormik.values.priority}
                  onChange={todoFormik.handleChange}
                  className="w-full p-3 rounded-lg border border-gray-300 bg-white"
                >
                  <option value="baixa">Baixa prioridade</option>
                  <option value="média">Média prioridade</option>
                  <option value="alta">Alta prioridade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={todoFormik.values.status}
                  onChange={todoFormik.handleChange}
                  className="w-full p-3 rounded-lg border border-gray-300 bg-white"
                >
                  <option value="a fazer">A Fazer</option>
                  <option value="fazendo">Fazendo</option>
                  <option value="pronto">Pronto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Atribuir a
              </label>
              <div className="flex flex-wrap gap-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      const isAssigned = todoFormik.values.assignedTo.includes(
                        user.id
                      );
                      todoFormik.setFieldValue(
                        "assignedTo",
                        isAssigned
                          ? todoFormik.values.assignedTo.filter(
                              (id) => id !== user.id
                            )
                          : [...todoFormik.values.assignedTo, user.id]
                      );
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                      todoFormik.values.assignedTo.includes(user.id)
                        ? "bg-[#0056b3] text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    <img
                      src={user.avatar}
                      className="w-4 h-4 rounded-full"
                      alt={user.name}
                    />
                    <span>{user.name.split(" ")[0]}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowUserModal(true)}
                  className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs hover:bg-gray-300 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={todoFormik.isSubmitting || !todoFormik.dirty}
              className="w-full bg-[#0056b3] hover:bg-[#004494] text-white p-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium"
            >
              {todoFormik.isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Plus size={18} />
                  Adicionar Tarefa
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lista de tarefas em colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statusColumns.map((column) => (
            <div
              key={column.id}
              className={`p-4 rounded-lg ${column.color} border ${column.borderColor} shadow-sm`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleColumn(column.id)}
              >
                <h2 className="text-lg font-semibold text-[#0056b3] flex items-center gap-2">
                  <span>{column.title}</span>
                  <span className="text-sm font-medium bg-white px-2 py-1 rounded-full border border-gray-200">
                    {groupedTodos[column.id]?.length || 0}
                  </span>
                </h2>
                {expandedColumns[column.id] ? (
                  <ChevronUp size={18} className="text-gray-500" />
                ) : (
                  <ChevronDown size={18} className="text-gray-500" />
                )}
              </div>

              {loading ? (
                <LoadingSpinner />
              ) : !expandedColumns[column.id] ? null : !groupedTodos[column.id]
                  ?.length ? (
                <div className="text-center py-8 text-gray-500 bg-white/50 rounded-lg border border-dashed border-gray-300">
                  Nenhuma tarefa nesta coluna
                </div>
              ) : (
                <ul className="space-y-3">
                  {groupedTodos[column.id].map((todo) => (
                    <li
                      key={todo.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, todo)}
                      onDragOver={handleUserDragOver}
                      onDrop={(e) => handleUserDrop(e, todo)}
                      onDragEnd={handleDragEnd}
                      className={`p-4 rounded-lg border flex justify-between items-start transition-all ${
                        todo.status === "pronto"
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() =>
                              toggleComplete(todo.id, todo.completed)
                            }
                            className={`mt-1 p-1 rounded-full ${
                              todo.completed
                                ? "text-green-500"
                                : "text-gray-400 hover:text-[#0056b3]"
                            }`}
                          >
                            <CheckCircle size={20} />
                          </button>

                          <div className="flex-1">
                            <p
                              className={`font-medium ${
                                todo.completed
                                  ? "line-through text-gray-500"
                                  : "text-gray-800"
                              }`}
                            >
                              {todo.title}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs mt-2">
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                {todo.category}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full font-medium ${
                                  todo.priority === "alta"
                                    ? "bg-red-100 text-red-800"
                                    : todo.priority === "média"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {todo.priority}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {todo.assignedTo?.map((userId) => {
                                const user = users.find((u) => u.id === userId);
                                return user ? (
                                  <img
                                    key={user.id}
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                    title={user.name}
                                    style={{
                                      borderColor:
                                        todo.status === "a fazer"
                                          ? "#3b82f6"
                                          : todo.status === "fazendo"
                                          ? "#f59e0b"
                                          : "#10b981",
                                    }}
                                  />
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeTodo(todo.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir tarefa"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing"
                          title="Mover tarefa"
                        >
                          <Move size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Estilos para drag and drop */}
      <style jsx>{`
        .dragging {
          opacity: 0.5;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .dragging-user {
          opacity: 0.7;
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 86, 179, 0.2);
        }
      `}</style>
    </div>
  );
}
